/**
 * The analysis behind `tests/unit/server/app-server-files.test.ts`: is every server load and form
 * action under `src/routes/(app)` provably guarded? Read from the TypeScript AST AND the type
 * checker (one `ts.Program` for all the files), never from text and never from names alone: a name
 * counts as a guard, or as something that reaches Go, only when it RESOLVES to the real declaration.
 *
 * What resolves to what (all through `checker.getSymbolAtLocation` / `getAliasedSymbol`, following
 * `const alias = original` chains and namespace imports):
 *   - guards:   `guardAppRoute` (lib/server/guards.ts), `authoriseAction` and `authoriseSelfService`
 *               (lib/server/form-action.ts); `parent` only as the destructured (or `event.`) member
 *               of the LOAD's own event parameter. A local stub, a module-level `const parent`, an
 *               `x.parent()` of anything else is not a guard.
 *   - reaches Go: the global `fetch`; `goFetch` / `loadCapabilities`; ANY function imported from a
 *               server module (lib/server/**, a route-local `_x.ts`, a feature `server.ts`) unless it
 *               is on PURE_HELPERS (exact `file#name`); a function of the SAME file whose body (to a
 *               fixed point, however deep) makes such a call.
 *   - indirect call forms (`.call` / `.apply` / `.bind` / `Reflect.apply` on a guard or on something
 *               that reaches Go, any element-access call `m['goFetch'](...)`) are refused outright.
 *
 * LOAD rule. A load that reaches Go must have, BEFORE the first such call, an UNCONDITIONAL
 * TOP-LEVEL statement that awaits the guard: `await parent()` / `const x = await parent()` / `await
 * guardAppRoute(event)`, with no call inside its own arguments. Not inside an `if` / `try` / loop,
 * not un-awaited, not one branch of `Promise.all`. `export const load = guardAppRoute` must resolve
 * to the real one.
 *
 * ACTION rule, per ACTION. Before the first Go-reaching call, the top-level pair
 *     const refused = await authoriseAction(event, form, <permission>, values);
 *     if (refused) return refused;
 * where `<permission>` resolves to a member of the `P` / `ACTION` tables (or of a table all of whose
 * members are such members): never a string literal, never empty. Or a top-level hand-off
 * `return helper(...)` to a PINNED authorising helper whose own body has the pair. A self-service
 * action is exempt from the permission only, by `<file>#<action>`: it holds the same pair with
 * `authoriseSelfService` (session + context fingerprint).
 *
 * `export { load } from './x'` and `export { load }` are followed; `export * from` and a spread inside
 * `actions` are refused (they hide what is exported).
 */
import { basename, resolve } from 'node:path';
import ts from 'typescript';
import { aliases } from '../../aliases.js';

const ROOT = resolve(import.meta.dirname, '../..')
	.split('\\')
	.join('/');
const norm = (p: string): string => p.split('\\').join('/');
const rel = (p: string): string => {
	const n = norm(p);
	return n.startsWith(`${ROOT}/`) ? n.slice(ROOT.length + 1) : n;
};

/**
 * Functions of a server module that never reach Go, pinned EXACTLY (`file#name`). Everything else
 * imported from a server module counts as reaching Go. Each reads or builds a response from data it
 * is given: no request, no cookie read that selects a Go call, no network.
 */
export const PURE_HELPERS: ReadonlySet<string> = new Set([
	'src/lib/server/form-action.ts#failForm',
	'src/lib/server/form-action.ts#failOutage',
	'src/lib/server/form-action.ts#failFromStatus',
	'src/lib/server/form-action.ts#zodFieldMessages',
	'src/lib/server/redirect.ts#safeRedirectPath',
	'src/lib/server/cookies.ts#setMustChangePassword',
	'src/lib/server/cookies.ts#mustChangePassword',
	'src/lib/server/auth-errors.ts#fieldValidationKeys'
]);

const GO_PRIMITIVES: ReadonlySet<string> = new Set([
	'src/lib/server/go.ts#goFetch',
	'src/lib/server/capabilities.ts#loadCapabilities'
]);

type GuardKind = 'parent' | 'guardAppRoute' | 'authoriseAction' | 'authoriseSelfService';
const GUARD_DECLS: Record<string, GuardKind> = {
	'src/lib/server/guards.ts#guardAppRoute': 'guardAppRoute',
	'src/lib/server/form-action.ts#authoriseAction': 'authoriseAction',
	'src/lib/server/form-action.ts#authoriseSelfService': 'authoriseSelfService'
};
const PERMISSION_TABLES: ReadonlySet<string> = new Set([
	'src/lib/features/auth/permissions.ts#P',
	'src/lib/features/auth/permissions.ts#ACTION'
]);

export interface Resolution {
	node: ts.Node;
	sf: ts.SourceFile;
}
export type Resolved = Resolution | { error: string } | null;

type FnLike =
	| ts.FunctionDeclaration
	| ts.FunctionExpression
	| ts.ArrowFunction
	| ts.MethodDeclaration;
const isFnLike = (n: ts.Node): n is FnLike =>
	ts.isFunctionDeclaration(n) ||
	ts.isFunctionExpression(n) ||
	ts.isArrowFunction(n) ||
	ts.isMethodDeclaration(n);

const unwrap = (n: ts.Node): ts.Node => {
	let cur = n;
	for (;;) {
		if (
			ts.isParenthesizedExpression(cur) ||
			ts.isAsExpression(cur) ||
			ts.isSatisfiesExpression(cur) ||
			ts.isNonNullExpression(cur)
		)
			cur = cur.expression;
		else return cur;
	}
};

/** True when any call / await sits anywhere under the node. */
function containsCall(node: ts.Node): boolean {
	let found = false;
	const visit = (n: ts.Node) => {
		if (found) return;
		if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isAwaitExpression(n)) found = true;
		else ts.forEachChild(n, visit);
	};
	visit(node);
	return found;
}

export interface Call {
	name: string;
	start: number;
	node: ts.CallExpression;
}
export type Kind = 'go' | 'guard' | 'none';

export interface Analysis {
	program: ts.Program;
	sourceFile(path: string): ts.SourceFile;
	resolveExport(sf: ts.SourceFile, name: string): Resolved;
	analyzeLoad(node: ts.Node): string[];
	analyzeAction(
		node: ts.Node,
		mode?: 'permission' | 'self',
		helpers?: ReadonlySet<string>
	): string[];
	analyzeActions(
		resolved: Resolution,
		helpers: ReadonlySet<string>,
		selfService?: (action: string) => boolean
	): { reports: ActionReport[]; errors: string[] };
	/** Every call under the node that reaches Go, in source order (for diagnostics and tests). */
	goCalls(node: ts.Node): Call[];
}
export interface ActionReport {
	name: string;
	problems: string[];
	selfService: boolean;
}

/**
 * One program over `files` (plus in-memory `overlay` files, keyed by absolute path, used by the
 * self-test for synthetic offenders). Module resolution is the repository's own: package `imports`
 * (`#lib/*`) and the `$`-aliases of `aliases.js`.
 */
export function createAnalysis(files: string[], overlay: Record<string, string> = {}): Analysis {
	const paths: Record<string, string[]> = {};
	for (const [alias, dir] of Object.entries(aliases)) {
		paths[alias] = [`${dir}/index.ts`];
		paths[`${alias}/*`] = [`${dir}/*`];
	}
	const options: ts.CompilerOptions = {
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		allowImportingTsExtensions: true,
		noEmit: true,
		strict: true,
		skipLibCheck: true,
		types: ['node'],
		baseUrl: ROOT,
		paths
	};
	const ov = new Map(Object.entries(overlay).map(([k, v]) => [norm(k), v]));
	const host = ts.createCompilerHost(options, true);
	const { fileExists, readFile, getSourceFile } = host;
	host.fileExists = (f) => ov.has(norm(f)) || fileExists(f);
	host.readFile = (f) => ov.get(norm(f)) ?? readFile(f);
	const overlayDirs = new Set([...ov.keys()].map((k) => k.slice(0, k.lastIndexOf('/'))));
	const { directoryExists } = host;
	host.directoryExists = (d) => overlayDirs.has(norm(d)) || (directoryExists?.(d) ?? false);
	host.getSourceFile = (f, lang, ...rest) => {
		const text = ov.get(norm(f));
		return text === undefined
			? getSourceFile(f, lang, ...rest)
			: ts.createSourceFile(f, text, lang, true);
	};
	const program = ts.createProgram({
		rootNames: [...files, ...ov.keys()].map(norm),
		options,
		host
	});
	const checker = program.getTypeChecker();

	/* ---------------------------------- resolution ---------------------------------- */

	function symbolOf(node: ts.Node): ts.Symbol | undefined {
		let sym = checker.getSymbolAtLocation(node);
		if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
		return sym;
	}

	/** The declaration an expression stands for, through `const alias = original` chains. */
	function declOf(expr: ts.Node, depth = 0): ts.Declaration | undefined {
		const e = unwrap(expr);
		const target = ts.isPropertyAccessExpression(e) ? e.name : e;
		const sym = symbolOf(target);
		const d = sym?.valueDeclaration ?? sym?.declarations?.[0];
		if (!d) return undefined;
		if (ts.isVariableDeclaration(d) && d.initializer && depth < 8) {
			const init = unwrap(d.initializer);
			if (ts.isIdentifier(init) || ts.isPropertyAccessExpression(init)) {
				return declOf(init, depth + 1) ?? d;
			}
		}
		return d;
	}

	const nameOf = (d: ts.Declaration): string => {
		const n = (d as ts.NamedDeclaration).name;
		return n && ts.isIdentifier(n) ? n.text : '';
	};
	const idOf = (d: ts.Declaration): string => `${rel(d.getSourceFile().fileName)}#${nameOf(d)}`;

	/** The function a declaration holds (a function, a method, or a const initialised with one). */
	function fnOf(d: ts.Declaration): FnLike | undefined {
		if (isFnLike(d)) return d;
		if (ts.isVariableDeclaration(d) && d.initializer) {
			const init = unwrap(d.initializer);
			if (isFnLike(init)) return init;
		}
		return undefined;
	}

	const isServerModule = (file: string): boolean => {
		const f = norm(file);
		return (
			f.includes('/src/lib/server/') ||
			f.includes('/src/routes/') ||
			basename(f).startsWith('server.') ||
			f.includes('/server/')
		);
	};

	/** Is `d` the destructured `parent` (or `event` itself) of `fn`'s first parameter? */
	function isLoadEventMember(d: ts.Declaration, fn: FnLike): boolean {
		const param = fn.parameters[0];
		if (!param) return false;
		if (ts.isBindingElement(d)) {
			const key = d.propertyName ?? d.name;
			return (
				ts.isIdentifier(key) &&
				key.text === 'parent' &&
				ts.isObjectBindingPattern(d.parent) &&
				d.parent.parent === param
			);
		}
		return false;
	}

	/** Which guard a call is, or null. `loadFn` is the load whose event `parent` must come from. */
	function guardKindOf(call: ts.CallExpression, loadFn?: FnLike): GuardKind | null {
		const callee = unwrap(call.expression);
		if (loadFn && ts.isPropertyAccessExpression(callee) && callee.name.text === 'parent') {
			const recv = declOf(callee.expression);
			const param = loadFn.parameters[0];
			if (recv && param && recv === param && ts.isIdentifier(param.name)) return 'parent';
		}
		if (!ts.isIdentifier(callee) && !ts.isPropertyAccessExpression(callee)) return null;
		const d = declOf(callee);
		if (!d) return null;
		if (loadFn && ts.isIdentifier(callee) && isLoadEventMember(d, loadFn)) return 'parent';
		return GUARD_DECLS[idOf(d)] ?? null;
	}

	/** What a declaration means for "does a call to it reach Go". Same-file functions: their bodies. */
	const fnKind = new Map<ts.Node, Kind>();
	function classify(d: ts.Declaration, callSiteFile: string): Kind {
		const id = idOf(d);
		if (id in GUARD_DECLS) return 'guard';
		if (GO_PRIMITIVES.has(id)) return 'go';
		const sf = d.getSourceFile();
		if (sf.isDeclarationFile) return nameOf(d) === 'fetch' ? 'go' : 'none';
		if (!isServerModule(sf.fileName)) return 'none';
		if (PURE_HELPERS.has(id)) return 'none';
		if (sf.fileName !== callSiteFile) return fnOf(d) || ts.isVariableDeclaration(d) ? 'go' : 'none';
		const fn = fnOf(d);
		if (!fn) return 'none';
		const known = fnKind.get(fn);
		if (known) return known;
		fnKind.set(fn, 'none'); // while computing: a cycle adds nothing
		const kind: Kind = calls(fn).some((c) => c.kind === 'go') ? 'go' : 'none';
		fnKind.set(fn, kind);
		return kind;
	}

	interface Classified extends Call {
		kind: Kind;
		problem?: string;
	}

	/** Every call under `node` (deep, nested closures included), classified. */
	function calls(node: ts.Node): Classified[] {
		const out: Classified[] = [];
		const site = node.getSourceFile().fileName;
		const visit = (n: ts.Node) => {
			if (ts.isCallExpression(n)) {
				const callee = unwrap(n.expression);
				const base = { start: n.getStart(), node: n };
				if (ts.isElementAccessExpression(callee)) {
					out.push({
						...base,
						name: '[...]',
						kind: 'go',
						problem: 'a call through an element access (`m["goFetch"](...)`) hides what is called'
					});
				} else if (
					ts.isPropertyAccessExpression(callee) &&
					['call', 'apply', 'bind'].includes(callee.name.text) &&
					isGoOrGuard(callee.expression, site)
				) {
					out.push({
						...base,
						name: callee.name.text,
						kind: 'go',
						problem: `\`.${callee.name.text}\` on a guard or on something that reaches Go`
					});
				} else if (
					ts.isPropertyAccessExpression(callee) &&
					ts.isIdentifier(callee.expression) &&
					callee.expression.text === 'Reflect' &&
					callee.name.text === 'apply' &&
					n.arguments[0] &&
					isGoOrGuard(n.arguments[0], site)
				) {
					out.push({
						...base,
						name: 'Reflect.apply',
						kind: 'go',
						problem: '`Reflect.apply` on a guard or on something that reaches Go'
					});
				} else if (ts.isIdentifier(callee) || ts.isPropertyAccessExpression(callee)) {
					const d = declOf(callee);
					const name = ts.isIdentifier(callee) ? callee.text : callee.name.text;
					out.push({ ...base, name, kind: d ? classify(d, site) : 'none' });
				}
			}
			ts.forEachChild(n, visit);
		};
		visit(node);
		return out.sort((a, b) => a.start - b.start);
	}

	function isGoOrGuard(expr: ts.Node, site: string): boolean {
		const d = declOf(expr);
		return d !== undefined && classify(d, site) !== 'none';
	}

	const goCalls = (node: ts.Node): Call[] => calls(node).filter((c) => c.kind === 'go');
	const problemsOf = (node: ts.Node): string[] =>
		calls(node).flatMap((c) => (c.problem ? [c.problem] : []));

	/* ---------------------------------- exports ---------------------------------- */

	function sourceFile(path: string): ts.SourceFile {
		const sf = program.getSourceFile(norm(path));
		if (!sf) throw new Error(`not in the program: ${path}`);
		return sf;
	}

	function resolveExport(sf: ts.SourceFile, name: string): Resolved {
		const mod = checker.getSymbolAtLocation(sf);
		const star = sf.statements.some((s) => ts.isExportDeclaration(s) && !s.exportClause);
		const direct = mod?.exports?.get(name as ts.__String);
		if (!direct) {
			return star ? { error: `"${name}" may hide behind \`export * from\` (not followed)` } : null;
		}
		const sym = direct.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(direct) : direct;
		const d = sym.valueDeclaration ?? sym.declarations?.[0];
		if (!d) return { error: `"${name}" is re-exported from an unreadable module` };
		if (ts.isVariableDeclaration(d)) {
			return d.initializer
				? { node: unwrap(d.initializer), sf: d.getSourceFile() }
				: { error: `"${name}" has no initializer the walker can read` };
		}
		if (ts.isFunctionDeclaration(d)) return { node: d, sf: d.getSourceFile() };
		return { error: `"${name}" is not a declaration the walker can read` };
	}

	/* ------------------------------------ loads ------------------------------------ */

	const statementsOf = (node: ts.Node): readonly ts.Statement[] | null =>
		isFnLike(node) && node.body && ts.isBlock(node.body) ? node.body.statements : null;

	/** `await <call>` (optionally `const x = await <call>`) of the wanted guard, with no call in its arguments. */
	function awaitedGuard(
		e: ts.Expression | undefined,
		wanted: readonly GuardKind[],
		loadFn?: FnLike
	): ts.CallExpression | null {
		if (!e) return null;
		const x = unwrap(e);
		if (!ts.isAwaitExpression(x)) return null;
		const call = unwrap(x.expression);
		if (!ts.isCallExpression(call)) return null;
		const kind = guardKindOf(call, loadFn);
		if (!kind || !wanted.includes(kind)) return null;
		if (call.arguments.some(containsCall)) return null;
		return call;
	}

	function isLoadGuardStatement(st: ts.Statement, loadFn: FnLike): boolean {
		const wanted: GuardKind[] = ['parent', 'guardAppRoute'];
		if (ts.isExpressionStatement(st)) return awaitedGuard(st.expression, wanted, loadFn) !== null;
		if (ts.isVariableStatement(st))
			return st.declarationList.declarations.some(
				(d) => awaitedGuard(d.initializer, wanted, loadFn) !== null
			);
		return false;
	}

	function analyzeLoad(node: ts.Node): string[] {
		const n = unwrap(node);
		if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) {
			const d = declOf(n);
			return d && GUARD_DECLS[idOf(d)] === 'guardAppRoute'
				? []
				: [`load is \`${n.getText()}\`, which does not resolve to the real guardAppRoute`];
		}
		if (!isFnLike(n)) return ['load is not a function the walker can read'];
		const problems = problemsOf(n);
		const go = goCalls(n);
		if (go.length === 0) return problems;
		const statements = statementsOf(n);
		if (!statements)
			return [
				...problems,
				`load reaches Go (${go[0]!.name}) from an expression body: no guard statement`
			];
		const guardAt = statements.findIndex((s) => isLoadGuardStatement(s, n));
		if (guardAt === -1)
			return [
				...problems,
				`load reaches Go (${go[0]!.name}) with no unconditional top-level \`await parent()\` of its own event (not in an if/try/loop, not un-awaited, not inside Promise.all, no call in its arguments)`
			];
		const guardStart = statements[guardAt]!.getStart();
		const early = go.find((c) => c.start < guardStart);
		return early
			? [...problems, `load reaches Go (${early.name}) before \`await parent()\``]
			: problems;
	}

	/* ----------------------------------- actions ----------------------------------- */

	/** The table an object-literal member belongs to (`P`, `ACTION`, a derived table), or undefined. */
	function tableOfMember(d: ts.Declaration): ts.VariableDeclaration | undefined {
		if (!ts.isPropertyAssignment(d) && !ts.isShorthandPropertyAssignment(d)) return undefined;
		let cur: ts.Node = d.parent;
		while (
			cur.parent &&
			(ts.isParenthesizedExpression(cur.parent) ||
				ts.isAsExpression(cur.parent) ||
				ts.isSatisfiesExpression(cur.parent))
		)
			cur = cur.parent;
		return ts.isVariableDeclaration(cur.parent) ? cur.parent : undefined;
	}

	function isPermissionTable(v: ts.VariableDeclaration, depth = 0): boolean {
		if (PERMISSION_TABLES.has(idOf(v))) return true;
		if (depth > 3 || !v.initializer) return false;
		const init = unwrap(v.initializer);
		return (
			ts.isObjectLiteralExpression(init) &&
			init.properties.length > 0 &&
			init.properties.every(
				(p) => ts.isPropertyAssignment(p) && permissionOk(p.initializer, depth + 1)
			)
		);
	}

	/** Does the expression resolve to a member of the P / ACTION tables (or a table made only of them)? */
	function permissionOk(expr: ts.Node, depth = 0): boolean {
		const e = unwrap(expr);
		if (ts.isStringLiteralLike(e)) return false;
		if (ts.isArrayLiteralExpression(e))
			return e.elements.length > 0 && e.elements.every((x) => permissionOk(x, depth));
		if (ts.isElementAccessExpression(e)) {
			const base = declOf(e.expression);
			return !!base && ts.isVariableDeclaration(base) && isPermissionTable(base, depth);
		}
		const d = declOf(e);
		if (!d) return false;
		const table = tableOfMember(d);
		return !!table && isPermissionTable(table, depth);
	}

	/** `const X = await <guard>(...)` with a top-level `if (X) return X;` after it -> index after the `if`. */
	function authorisationEnd(
		statements: readonly ts.Statement[],
		mode: 'permission' | 'self'
	): { end: number } | { error: string } {
		const wanted: GuardKind = mode === 'self' ? 'authoriseSelfService' : 'authoriseAction';
		for (let i = 0; i < statements.length; i++) {
			const st = statements[i]!;
			if (!ts.isVariableStatement(st)) continue;
			const decl = st.declarationList.declarations.find(
				(d) => ts.isIdentifier(d.name) && awaitedGuard(d.initializer, [wanted]) !== null
			);
			if (!decl) continue;
			const call = awaitedGuard(decl.initializer, [wanted])!;
			if (mode === 'permission') {
				const permission = call.arguments[2];
				if (!permission || !permissionOk(permission))
					return {
						error:
							'the permission of authoriseAction does not resolve to a member of the P / ACTION tables'
					};
			}
			const name = (decl.name as ts.Identifier).text;
			for (let j = i + 1; j < statements.length; j++) {
				const next = statements[j]!;
				if (!ts.isIfStatement(next)) continue;
				const cond = unwrap(next.expression);
				if (!ts.isIdentifier(cond) || cond.text !== name) continue;
				const then = next.thenStatement;
				const returns = (s: ts.Statement): boolean =>
					ts.isReturnStatement(s) &&
					!!s.expression &&
					ts.isIdentifier(unwrap(s.expression)) &&
					(unwrap(s.expression) as ts.Identifier).text === name;
				const ok = ts.isBlock(then) ? then.statements.some(returns) : returns(then);
				if (ok) return { end: next.getEnd() };
			}
			return {
				error: `the result of ${wanted} (\`${name}\`) is never returned on refusal (\`if (${name}) return ${name};\`)`
			};
		}
		return { error: `no unconditional top-level \`const refused = await ${wanted}(...)\`` };
	}

	function analyzeAction(
		node: ts.Node,
		mode: 'permission' | 'self' = 'permission',
		helpers: ReadonlySet<string> = new Set()
	): string[] {
		const n = unwrap(node);
		if (!isFnLike(n)) return ['action is not a function the walker can read'];
		const statements = statementsOf(n);
		if (!statements) return ['action has an expression body: no authorisation statement'];
		const problems = problemsOf(n);
		const go = goCalls(n);

		const pair = authorisationEnd(statements, mode);
		if (!('error' in pair)) {
			const early = go.find((c) => c.start < pair.end);
			return early
				? [...problems, `action reaches Go (${early.name}) before it is authorised`]
				: problems;
		}
		// A top-level hand-off to a PINNED authorising helper whose own body has the pair.
		if (mode === 'permission') {
			for (const st of statements) {
				if (!ts.isReturnStatement(st) || !st.expression) continue;
				let e = unwrap(st.expression);
				if (ts.isAwaitExpression(e)) e = unwrap(e.expression);
				if (!ts.isCallExpression(e)) continue;
				const d = declOf(e.expression);
				if (!d || !helpers.has(idOf(d))) continue;
				const helper = fnOf(d);
				if (!helper) return [...problems, `helper ${nameOf(d)} is not a readable function`];
				const hp = analyzeAction(helper, 'permission');
				if (hp.length > 0) return [...problems, ...hp.map((p) => `helper ${nameOf(d)}: ${p}`)];
				const early = go.find((c) => c.start < st.getStart());
				return early
					? [...problems, `action reaches Go (${early.name}) before it hands off to ${nameOf(d)}`]
					: problems;
			}
		}
		return [...problems, pair.error];
	}

	function actionFunctions(actions: ts.Node): {
		fns: Array<{ name: string; node: ts.Node }>;
		errors: string[];
	} {
		const fns: Array<{ name: string; node: ts.Node }> = [];
		const errors: string[] = [];
		let obj = unwrap(actions);
		if (ts.isIdentifier(obj)) {
			const d = declOf(obj);
			if (d && ts.isVariableDeclaration(d) && d.initializer) obj = unwrap(d.initializer);
		}
		if (!ts.isObjectLiteralExpression(obj)) {
			return { fns, errors: ['actions is not an object literal the walker can read'] };
		}
		for (const p of obj.properties) {
			if (ts.isSpreadAssignment(p)) {
				errors.push('actions contains a spread: what it exports is hidden');
				continue;
			}
			const nn = p.name;
			const name = nn && (ts.isIdentifier(nn) || ts.isStringLiteral(nn)) ? nn.text : '?';
			if (ts.isMethodDeclaration(p)) fns.push({ name, node: p });
			else if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
				const init = ts.isPropertyAssignment(p) ? unwrap(p.initializer) : p.name;
				if (ts.isIdentifier(init)) {
					const d = declOf(init);
					const fn = d && fnOf(d);
					if (fn) fns.push({ name, node: fn });
					else
						errors.push(
							`action "${name}" is \`${init.text}\`, which is not a function the walker can read`
						);
				} else fns.push({ name, node: init });
			}
		}
		return { fns, errors };
	}

	function analyzeActions(
		resolved: Resolution,
		helpers: ReadonlySet<string>,
		selfService: (action: string) => boolean = () => false
	): { reports: ActionReport[]; errors: string[] } {
		const { fns, errors } = actionFunctions(resolved.node);
		const reports = fns.map(({ name, node }) => {
			const exempt = selfService(name);
			return {
				name,
				selfService: exempt,
				problems: analyzeAction(node, exempt ? 'self' : 'permission', helpers)
			};
		});
		return { reports, errors };
	}

	return {
		program,
		sourceFile,
		resolveExport,
		analyzeLoad,
		analyzeAction,
		analyzeActions,
		goCalls
	};
}
