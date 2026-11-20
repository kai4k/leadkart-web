/**
 * The analysis behind `tests/unit/server/app-server-files.test.ts`: is every server load and form
 * action under `src/routes` guarded? A POSITIONAL contract, read from the TypeScript syntax tree:
 * **the guard is the first thing a load or an action does, and nothing else may run before it.**
 *
 * It does not try to recognise which calls reach Go (an open-ended set: three review rounds found a
 * new way past every classifier). The type checker is used ONLY to prove that the guard identifiers
 * resolve to the real declarations (through imports, aliases, namespaces), never to classify a call.
 *
 * LOAD (`+layout.server.ts` / `+page.server.ts`), declared in the file itself (no re-export):
 *   - `export const load = guardAppRoute` (the identifier resolves to the real export), or
 *   - a function whose FIRST statement is `await parent();` or `const <pattern> = await parent();`,
 *     where `parent` is the destructured `parent` of the load event parameter (or `event.parent` of
 *     the first parameter), proved by the checker. No default-parameter initialiser and no
 *     destructuring default in the parameters may contain a call (they run before the first statement).
 *
 * ACTION, per action, in `export const actions = { ... }` (an object literal declared in the file;
 * properties are function expressions / arrows / methods, or the ONE pinned helper
 * `saveTenantSection(<string literal>)`, whose returned function is held to this same contract; no
 * spread, no factory call, no shorthand, no re-export). The body starts, in order and with nothing
 * between, with
 *     [const fd = await <event>.request.formData();]          (optional, once; `request` destructured
 *                                                              from the parameter is accepted too)
 *     const refused = await authoriseAction(<event>, fd, <permission>, <values>);
 *                                       or authoriseSelfService(<event>, fd, <values>);
 *     if (refused) return refused;
 * where both guards resolve to the real exports, the result is a `const`, the first argument is the
 * action's own event parameter (not a spread, an object literal or another value), no argument runs
 * a call / `new` / `await` / tagged template (a function expression is fine: it is not run), and the
 * permission is a member of the `P` / `ACTION` tables. Everything after the `if` is unrestricted.
 *
 * MODULE LEVEL of a held file: no top-level `await`, no call / `new` / tagged template that runs at
 * module scope (function and method bodies do not run there; computed keys, `extends` and static
 * initialisers do), except the pinned `saveTenantSection('<literal>')` as an action. No class or
 * member decorator, no side-effect import of a local module (`import './x.ts'`). `load`, `actions`
 * and every name the export resolves through are `const` and never assigned anywhere in the file
 * (including compound / destructuring assignment, `delete`, `Object.assign(actions, ...)`,
 * `Object.defineProperty`, `Reflect.set`).
 *
 * PLACEMENT of a held file: under `src/routes/(app)/`, and a real `guardAppRoute` layout load in its
 * own directory or above it (or it is that guard); a new route group needs an explicit decision.
 *
 * OUT OF THE CONTRACT: the evaluation of IMPORTED modules. A module runs once per process, when it is
 * first imported, not per request; what it does at import time is not a property of a route file and
 * is not walked. Static code in `src/lib/server/**` is covered by its own tests.
 *
 * The guard's arguments: the first is the action's event parameter; the second is the `FormData` read
 * by the statement before it; the values is an object literal or a function that only reads the form
 * (`<fd>.get(...)`, `<fd>.getAll(...)`, the global `String(...)`, and the pinned field readers below).
 */
import { resolve } from 'node:path';
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

type GuardKind = 'guardAppRoute' | 'authoriseAction' | 'authoriseSelfService';
const GUARD_DECLS: Record<string, GuardKind> = {
	'src/lib/server/guards.ts#guardAppRoute': 'guardAppRoute',
	'src/lib/server/form-action.ts#authoriseAction': 'authoriseAction',
	'src/lib/server/form-action.ts#authoriseSelfService': 'authoriseSelfService'
};
const PERMISSION_TABLES: ReadonlySet<string> = new Set([
	'src/lib/features/auth/permissions.ts#P',
	'src/lib/features/auth/permissions.ts#ACTION'
]);
/** The one helper that builds an action: `saveTenantSection('<literal section>')`. */
export const PINNED_ACTION_HELPER =
	'src/routes/(app)/settings/tenant/_actions.ts#saveTenantSection';

/**
 * The local functions a `values` function of the guard may call, EXACTLY: each only reads form fields
 * (it is called with the form data and nothing else). A new reader is a decision, with a reason.
 */
export const PINNED_FIELD_READERS: Record<string, string> = {
	'src/routes/(app)/settings/account/profile/+page.server.ts#profilePatch':
		'Reads the profile fields from the form.',
	'src/routes/(app)/settings/account/security/+page.server.ts#emailValues':
		'Reads the new-email field from the form.',
	'src/routes/(app)/settings/roles/new/+page.server.ts#rolePayload':
		'Reads the role fields from the form.',
	'src/routes/(app)/settings/tenant/_actions.ts#SECTION_FORMS':
		'The per-section form readers of the tenant settings (called as SECTION_FORMS[section](form)).'
};

export interface ActionReport {
	name: string;
	problems: string[];
	guard: 'authoriseAction' | 'authoriseSelfService' | null;
}

export interface Analysis {
	program: ts.Program;
	/** Null when the file has no `load`. */
	loadProblems(file: string): string[] | null;
	/** Null when the file has no `actions`. `errors` are problems of the object itself. */
	actionReports(
		file: string,
		selfService?: (action: string) => boolean
	): { reports: ActionReport[]; errors: string[] } | null;
	moduleProblems(file: string): string[];
	/** Is the file's `load` the real shared guard (`export const load = guardAppRoute`)? */
	isSharedGuard(file: string): boolean;
	/** The pinned helper's returned function, held to the action contract itself. */
	pinnedHelperProblems(): string[];
	/**
	 * Where a held file sits: under src/routes/(app)/, and (unless `guardChain` is false) under a real
	 * guardAppRoute layout, or being one. The file and its layouts must be in the program.
	 */
	placementProblems(file: string, opts?: { guardChain?: boolean }): string[];
	/** Every value exported by src/lib/server/** that the file references (`<file>#<name>`, sorted). */
	serverCallees(file: string): string[];
}

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
			ts.isNonNullExpression(cur) ||
			ts.isTypeAssertionExpression(cur)
		)
			cur = cur.expression;
		else return cur;
	}
};

const isFunctionBoundary = (n: ts.Node): boolean =>
	ts.isFunctionDeclaration(n) ||
	ts.isFunctionExpression(n) ||
	ts.isArrowFunction(n) ||
	ts.isMethodDeclaration(n) ||
	ts.isGetAccessorDeclaration(n) ||
	ts.isSetAccessorDeclaration(n) ||
	ts.isConstructorDeclaration(n);

interface Runs {
	node: ts.Node;
	kind: 'await' | 'call';
	text: string;
}

/**
 * The first thing under `node` that RUNS when `node` is evaluated: a call, `new`, tagged template,
 * `await`. Function and method bodies are not entered (defining a function runs nothing); a class
 * runs its `extends` expression, computed member names, static initialisers and static blocks.
 * Types are skipped. `allowed` call nodes are not reported.
 */
function firstRun(node: ts.Node, allowed: ReadonlySet<ts.Node> = new Set()): Runs | null {
	let found: Runs | null = null;
	const visit = (n: ts.Node): void => {
		if (found) return;
		if (ts.isTypeNode(n) || ts.isImportDeclaration(n)) return;
		if (isFunctionBoundary(n)) return;
		if (ts.isAwaitExpression(n)) {
			found = { node: n, kind: 'await', text: n.getText() };
			return;
		}
		if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n)) {
			if (!allowed.has(n)) {
				found = { node: n, kind: 'call', text: n.getText() };
				return;
			}
		}
		if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) {
			for (const h of n.heritageClauses ?? []) for (const t of h.types) visit(t.expression);
			for (const m of n.members) {
				if (m.name && ts.isComputedPropertyName(m.name)) visit(m.name);
				if (ts.isClassStaticBlockDeclaration(m)) visit(m.body);
				else if (
					ts.isPropertyDeclaration(m) &&
					m.initializer &&
					m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)
				)
					visit(m.initializer);
			}
			return;
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return found;
}

const short = (n: ts.Node | undefined): string =>
	n ? n.getText().replace(/\s+/g, ' ').slice(0, 70) : 'nothing';

/**
 * One program over `files` plus the in-memory `overlay` (absolute path -> source; the self-test's
 * synthetic offenders). Module resolution is the repository's own: package `imports` (`#lib/*`) and
 * the `$`-aliases of `aliases.js`.
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
	const { fileExists, readFile, getSourceFile, directoryExists } = host;
	host.fileExists = (f) => ov.has(norm(f)) || fileExists(f);
	host.readFile = (f) => ov.get(norm(f)) ?? readFile(f);
	const overlayDirs = new Set([...ov.keys()].map((k) => k.slice(0, k.lastIndexOf('/'))));
	host.directoryExists = (d) => overlayDirs.has(norm(d)) || (directoryExists?.(d) ?? false);
	host.getSourceFile = (f, lang, ...rest) => {
		const text = ov.get(norm(f));
		return text === undefined
			? getSourceFile(f, lang, ...rest)
			: ts.createSourceFile(f, text, lang, true);
	};
	const helperFile = `${ROOT}/${PINNED_ACTION_HELPER.split('#')[0]}`;
	const program = ts.createProgram({
		rootNames: [...new Set([...files.map(norm), ...ov.keys(), helperFile])],
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

	function guardKindOf(callee: ts.Node): GuardKind | null {
		const c = unwrap(callee);
		if (!ts.isIdentifier(c) && !ts.isPropertyAccessExpression(c)) return null;
		const d = declOf(c);
		return d ? (GUARD_DECLS[idOf(d)] ?? null) : null;
	}

	/** The declaration the identifier `node` refers to, no alias chasing (a parameter, a local const). */
	function localDecl(node: ts.Node): ts.Declaration | undefined {
		const e = unwrap(node);
		if (!ts.isIdentifier(e)) return undefined;
		const sym = checker.getSymbolAtLocation(e);
		return sym?.valueDeclaration ?? sym?.declarations?.[0];
	}

	/** Is `e` the first parameter of `fn` itself (an identifier-named parameter)? */
	function isEventParam(e: ts.Node, fn: FnLike): boolean {
		const p = fn.parameters[0];
		return !!p && ts.isIdentifier(p.name) && localDecl(e) === p;
	}

	/** Is `e` a name bound by destructuring the first parameter of `fn`, under the key `key`? */
	function isDestructuredMember(e: ts.Node, fn: FnLike, key: string): boolean {
		const p = fn.parameters[0];
		const d = localDecl(e);
		if (!p || !d || !ts.isBindingElement(d)) return false;
		const k = d.propertyName ?? d.name;
		return (
			!d.initializer &&
			ts.isIdentifier(k) &&
			k.text === key &&
			ts.isObjectBindingPattern(d.parent) &&
			d.parent.parent === p
		);
	}

	/* ------------------------------------ exports ----------------------------------- */

	type Exported = { node: ts.Node } | { error: string } | null;

	/** The initialiser / function of `export const name` or `export function name`, declared IN this file. */
	function exportedHere(sf: ts.SourceFile, name: string): Exported {
		const hasModifier = (s: ts.Node) =>
			ts.canHaveModifiers(s) &&
			ts.getModifiers(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
		const localInit = (id: string): Exported => {
			for (const s of sf.statements) {
				if (ts.isFunctionDeclaration(s) && s.name?.text === id && s.body) return { node: s };
				if (ts.isVariableStatement(s)) {
					for (const d of s.declarationList.declarations) {
						if (ts.isIdentifier(d.name) && d.name.text === id) {
							return d.initializer
								? { node: unwrap(d.initializer) }
								: { error: `"${id}" has no initializer the walker can read` };
						}
					}
				}
			}
			return null;
		};
		for (const s of sf.statements) {
			if (!ts.isExportDeclaration(s) || !s.exportClause || !ts.isNamedExports(s.exportClause)) {
				continue;
			}
			for (const el of s.exportClause.elements) {
				if (el.name.text !== name) continue;
				if (s.moduleSpecifier)
					return { error: `"${name}" must be declared in this file, not re-exported` };
				return (
					localInit((el.propertyName ?? el.name).text) ?? {
						error: `"${name}" is not declared in this file`
					}
				);
			}
		}
		for (const s of sf.statements) {
			if (ts.isFunctionDeclaration(s) && s.name?.text === name && hasModifier(s)) {
				return s.body ? { node: s } : { error: `"${name}" has no body` };
			}
			if (ts.isVariableStatement(s) && hasModifier(s)) {
				for (const d of s.declarationList.declarations) {
					if (ts.isIdentifier(d.name) && d.name.text === name) {
						return d.initializer
							? { node: unwrap(d.initializer) }
							: { error: `"${name}" has no initializer the walker can read` };
					}
				}
			}
		}
		if (sf.statements.some((s) => ts.isExportDeclaration(s) && !s.exportClause)) {
			return {
				error: `"${name}" may hide behind \`export * from\` and must be declared in this file`
			};
		}
		return null;
	}

	function sourceFileOf(path: string): ts.SourceFile {
		const sf = program.getSourceFile(norm(path));
		if (!sf) throw new Error(`not in the program: ${path}`);
		return sf;
	}

	/* ------------------------------------- loads ------------------------------------ */

	/** `await parent()` of the load's own event, as an expression? */
	function isAwaitedParent(e: ts.Expression | undefined, fn: FnLike): boolean {
		if (!e) return false;
		const x = unwrap(e);
		if (!ts.isAwaitExpression(x)) return false;
		const call = unwrap(x.expression);
		if (!ts.isCallExpression(call) || call.arguments.length !== 0) return false;
		const callee = unwrap(call.expression);
		if (ts.isIdentifier(callee)) return isDestructuredMember(callee, fn, 'parent');
		return (
			ts.isPropertyAccessExpression(callee) &&
			callee.name.text === 'parent' &&
			isEventParam(callee.expression, fn)
		);
	}

	function loadFnProblems(fn: FnLike): string[] {
		const start = 'load must start with `await parent()` (of its own event)';
		if (!fn.body || !ts.isBlock(fn.body)) return [`${start}: it has an expression body`];
		for (const p of fn.parameters) {
			const run = firstRun(p);
			if (run)
				return [
					`a call in the load's parameters (${short(run.node)}) runs before \`await parent()\``
				];
		}
		const first = fn.body.statements[0];
		const ok =
			first &&
			((ts.isExpressionStatement(first) && isAwaitedParent(first.expression, fn)) ||
				(ts.isVariableStatement(first) &&
					first.declarationList.flags & ts.NodeFlags.Const &&
					first.declarationList.declarations.length === 1 &&
					isAwaitedParent(first.declarationList.declarations[0]!.initializer, fn)));
		return ok ? [] : [`${start}; its first statement is: ${short(first)}`];
	}

	function loadProblems(file: string): string[] | null {
		const exp = exportedHere(sourceFileOf(file), 'load');
		if (!exp) return null;
		if ('error' in exp) return [exp.error];
		const n = unwrap(exp.node);
		if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) {
			return guardKindOf(n) === 'guardAppRoute'
				? []
				: [`load is \`${n.getText()}\`, which does not resolve to the real guardAppRoute`];
		}
		if (!isFnLike(n))
			return ['load must be the real guardAppRoute or a function the walker can read'];
		return loadFnProblems(n);
	}

	function isSharedGuard(file: string): boolean {
		const exp = exportedHere(sourceFileOf(file), 'load');
		if (!exp || 'error' in exp) return false;
		const n = unwrap(exp.node);
		return (
			(ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) && guardKindOf(n) === 'guardAppRoute'
		);
	}

	/* ------------------------------------ actions ----------------------------------- */

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

	const GUARD_SHAPE =
		'the action must start with [`const fd = await <event>.request.formData();`] `const refused = await authoriseAction(<event>, fd, <permission>, <values>);` (or authoriseSelfService) and `if (refused) return refused;`';

	/** `await <event>.request.formData()` (or `request.formData()` of the destructured `request`). */
	function isFormDataRead(e: ts.Expression | undefined, fn: FnLike): boolean {
		if (!e) return false;
		const x = unwrap(e);
		if (!ts.isAwaitExpression(x)) return false;
		const call = unwrap(x.expression);
		if (!ts.isCallExpression(call) || call.arguments.length !== 0) return false;
		const callee = unwrap(call.expression);
		if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'formData') return false;
		const recv = unwrap(callee.expression);
		if (ts.isIdentifier(recv)) return isDestructuredMember(recv, fn, 'request');
		return (
			ts.isPropertyAccessExpression(recv) &&
			recv.name.text === 'request' &&
			isEventParam(recv.expression, fn)
		);
	}

	/** Is `callee` the global `String`, not a local that shares the name? */
	function isGlobalString(callee: ts.Node): boolean {
		const c = unwrap(callee);
		if (!ts.isIdentifier(c) || c.text !== 'String') return false;
		const d = declOf(c);
		return !!d && program.isSourceFileDefaultLibrary(d.getSourceFile());
	}

	/** `<fd>.get(...)` / `<fd>.getAll(...)` on exactly the FormData the guard was given. */
	function isFormRead(callee: ts.Node, formData: ts.VariableDeclaration): boolean {
		const c = unwrap(callee);
		return (
			ts.isPropertyAccessExpression(c) &&
			(c.name.text === 'get' || c.name.text === 'getAll') &&
			localDecl(c.expression) === formData
		);
	}

	/** A call of a pinned field reader with the guard's FormData as its only argument. */
	function isPinnedReaderCall(call: ts.CallExpression, formData: ts.VariableDeclaration): boolean {
		const callee = unwrap(call.expression);
		const target = ts.isElementAccessExpression(callee) ? callee.expression : callee;
		if (!ts.isIdentifier(target)) return false;
		const d = declOf(target);
		if (!d || !(idOf(d) in PINNED_FIELD_READERS)) return false;
		return call.arguments.length === 1 && localDecl(call.arguments[0]!) === formData;
	}

	/** Null when the `values` argument may only read the form; else why not. */
	function valuesArgumentProblem(
		arg: ts.Expression | undefined,
		formData: ts.VariableDeclaration
	): string | null {
		if (!arg) return 'it is missing';
		const v = unwrap(arg);
		if (ts.isObjectLiteralExpression(v)) {
			let hidden: ts.Node | null = null;
			const visit = (n: ts.Node): void => {
				if (hidden) return;
				if (isFunctionBoundary(n)) {
					hidden = n;
					return;
				}
				ts.forEachChild(n, visit);
			};
			ts.forEachChild(v, visit);
			return hidden
				? `an object literal must not contain a function or accessor (${short(hidden)}): it can run when the values are read`
				: null;
		}
		if (!isFnLike(v) || ts.isFunctionDeclaration(v)) {
			return `it must be an object literal or a function that only reads the form, not \`${short(v)}\``;
		}
		for (const p of v.parameters) {
			const run = firstRun(p);
			if (run) return `a call in the parameters (${short(run.node)}) is not a form read`;
		}
		const allowed = new Set<ts.Node>();
		const collect = (n: ts.Node): void => {
			if (isFunctionBoundary(n)) return;
			if (
				ts.isCallExpression(n) &&
				(isFormRead(n.expression, formData) ||
					isGlobalString(n.expression) ||
					isPinnedReaderCall(n, formData))
			)
				allowed.add(n);
			ts.forEachChild(n, collect);
		};
		if (v.body) collect(v.body);
		const run = v.body ? firstRun(v.body, allowed) : null;
		return run
			? `${run.kind === 'await' ? 'an await' : 'the call'} \`${short(run.node)}\` is not a read of the form (only <fd>.get, <fd>.getAll, String and the pinned field readers are allowed)`
			: null;
	}

	function actionFnProblems(fn: FnLike): { problems: string[]; guard: ActionReport['guard'] } {
		const fail = (p: string) => ({ problems: [p], guard: null as ActionReport['guard'] });
		// Parameters (and their defaults) run before the body, so before everything the contract reads.
		for (const p of fn.parameters) {
			const run = firstRun(p);
			if (run) {
				return fail(`a call in the action's parameters (${short(run.node)}) runs before the guard`);
			}
		}
		if (!fn.body || !ts.isBlock(fn.body)) return fail(`an expression body: ${GUARD_SHAPE}`);
		const statements = fn.body.statements;
		let i = 0;
		const first = statements[0];
		let formData: ts.VariableDeclaration | undefined;
		if (
			first &&
			ts.isVariableStatement(first) &&
			first.declarationList.flags & ts.NodeFlags.Const &&
			first.declarationList.declarations.length === 1 &&
			ts.isIdentifier(first.declarationList.declarations[0]!.name) &&
			isFormDataRead(first.declarationList.declarations[0]!.initializer, fn)
		) {
			i = 1;
			formData = first.declarationList.declarations[0]!;
		}

		const st = statements[i];
		const decl =
			st && ts.isVariableStatement(st) && st.declarationList.declarations.length === 1
				? st.declarationList.declarations[0]!
				: undefined;
		const awaited = decl?.initializer ? unwrap(decl.initializer) : undefined;
		const call = awaited && ts.isAwaitExpression(awaited) ? unwrap(awaited.expression) : undefined;
		const kind = call && ts.isCallExpression(call) ? guardKindOf(call.expression) : null;
		if (
			!st ||
			!decl ||
			!call ||
			!ts.isCallExpression(call) ||
			(kind !== 'authoriseAction' && kind !== 'authoriseSelfService')
		) {
			return fail(`${GUARD_SHAPE}; found: ${short(st)}`);
		}
		if (!ts.isVariableStatement(st) || !(st.declarationList.flags & ts.NodeFlags.Const)) {
			return fail(
				'the guard result must be a `const` (a `let` can be reassigned before it is checked)'
			);
		}
		if (!ts.isIdentifier(decl.name))
			return fail(`${GUARD_SHAPE}; the result must be one identifier`);
		const result = decl.name;
		const args = call.arguments;
		if (args.some(ts.isSpreadElement) || !args[0] || !isEventParam(args[0], fn)) {
			return fail(
				"the first argument of the guard must be the action's own event parameter (not a spread, an object literal or another value)"
			);
		}
		if (!formData || !args[1] || localDecl(args[1]) !== formData) {
			return fail(
				'the second argument of the guard must be the FormData read by `const fd = await <event>.request.formData();` in the statement before it'
			);
		}
		for (const a of args) {
			const run = firstRun(a);
			if (run) {
				return fail(
					`no call, new, await or tagged template may run inside the guard arguments (found ${short(run.node)})`
				);
			}
		}
		const valuesIndex = kind === 'authoriseAction' ? 3 : 2;
		const valuesProblem = valuesArgumentProblem(args[valuesIndex], formData);
		if (valuesProblem) return fail(`the values argument of the guard: ${valuesProblem}`);
		if (kind === 'authoriseAction' && (!args[2] || !permissionOk(args[2]))) {
			return fail(
				'the permission of authoriseAction does not resolve to a member of the P / ACTION tables'
			);
		}
		// `if (refused) return refused;` immediately after.
		const next = statements[i + 1];
		const returnsResult = (s: ts.Statement): boolean =>
			ts.isReturnStatement(s) && !!s.expression && localDecl(s.expression) === decl;
		const checks =
			next &&
			ts.isIfStatement(next) &&
			!next.elseStatement &&
			localDecl(next.expression) === decl &&
			(ts.isBlock(next.thenStatement)
				? next.thenStatement.statements.length === 1 &&
					returnsResult(next.thenStatement.statements[0]!)
				: returnsResult(next.thenStatement));
		if (!checks) {
			return {
				problems: [
					`\`if (${result.text}) return ${result.text};\` (the guard result, returned on refusal) must follow the guard immediately; found: ${short(next)}`
				],
				guard: kind
			};
		}
		return { problems: [], guard: kind };
	}

	/** The pinned helper `saveTenantSection('<literal>')`: callee resolves to it, one string literal argument. */
	function isPinnedHelperCall(e: ts.Node): e is ts.CallExpression {
		const call = unwrap(e);
		if (!ts.isCallExpression(call)) return false;
		const d = declOf(call.expression);
		return (
			!!d &&
			idOf(d) === PINNED_ACTION_HELPER &&
			call.arguments.length === 1 &&
			ts.isStringLiteral(call.arguments[0]!)
		);
	}

	let helperCache: string[] | undefined;
	function pinnedHelperProblems(): string[] {
		if (helperCache) return helperCache;
		const [file] = PINNED_ACTION_HELPER.split('#') as [string];
		const sf = program.getSourceFile(`${ROOT}/${file}`);
		const exp = sf ? exportedHere(sf, 'saveTenantSection') : null;
		if (
			!exp ||
			'error' in exp ||
			!isFnLike(exp.node) ||
			!exp.node.body ||
			!ts.isBlock(exp.node.body)
		) {
			return (helperCache = [
				'the pinned action helper saveTenantSection is not a function the walker can read'
			]);
		}
		const body = exp.node.body.statements;
		const ret = body.length === 1 ? body[0] : undefined;
		const returned =
			ret && ts.isReturnStatement(ret) && ret.expression ? unwrap(ret.expression) : undefined;
		if (!returned || !isFnLike(returned)) {
			return (helperCache = [
				'saveTenantSection must consist of one `return <function>`: nothing may run before the returned action'
			]);
		}
		const { problems, guard } = actionFnProblems(returned);
		return (helperCache = [
			...problems.map((p) => `saveTenantSection: ${p}`),
			...(problems.length === 0 && guard !== 'authoriseAction'
				? ['saveTenantSection must authorise with authoriseAction (a permission per section)']
				: [])
		]);
	}

	/** The pinned helper calls of an `actions` object (the only calls allowed at module level). */
	function pinnedCallsOf(sf: ts.SourceFile): Set<ts.Node> {
		const out = new Set<ts.Node>();
		const exp = exportedHere(sf, 'actions');
		if (!exp || 'error' in exp) return out;
		const obj = unwrap(exp.node);
		if (!ts.isObjectLiteralExpression(obj)) return out;
		for (const p of obj.properties) {
			if (ts.isPropertyAssignment(p) && isPinnedHelperCall(p.initializer))
				out.add(unwrap(p.initializer));
		}
		return out;
	}

	function actionReports(
		file: string,
		selfService: (action: string) => boolean = () => false
	): { reports: ActionReport[]; errors: string[] } | null {
		const exp = exportedHere(sourceFileOf(file), 'actions');
		if (!exp) return null;
		if ('error' in exp) return { reports: [], errors: [exp.error] };
		const obj = unwrap(exp.node);
		if (!ts.isObjectLiteralExpression(obj)) {
			return { reports: [], errors: ['actions must be an object literal declared in this file'] };
		}
		const reports: ActionReport[] = [];
		const errors: string[] = [];
		for (const p of obj.properties) {
			if (ts.isSpreadAssignment(p)) {
				errors.push('actions contains a spread: what it exports is hidden');
				continue;
			}
			const nn = p.name;
			if (!nn || !(ts.isIdentifier(nn) || ts.isStringLiteral(nn))) {
				errors.push('actions: an action name must be an identifier or a string literal');
				continue;
			}
			const name = nn.text;
			let result: { problems: string[]; guard: ActionReport['guard'] };
			if (ts.isMethodDeclaration(p)) result = actionFnProblems(p);
			else if (ts.isPropertyAssignment(p)) {
				const init = unwrap(p.initializer);
				if (isFnLike(init) && !ts.isFunctionDeclaration(init)) result = actionFnProblems(init);
				else if (isPinnedHelperCall(init)) {
					result = { problems: pinnedHelperProblems(), guard: 'authoriseAction' };
				} else {
					result = {
						problems: [
							`actions: "${name}" must be a function expression or the pinned saveTenantSection('<section>'), not \`${short(init)}\``
						],
						guard: null
					};
				}
			} else {
				result = {
					problems: [
						`actions: "${name}" must be a function expression, not a shorthand or accessor`
					],
					guard: null
				};
			}
			const pinnedSelf = selfService(name);
			const problems = [...result.problems];
			if (problems.length === 0) {
				if (result.guard === 'authoriseSelfService' && !pinnedSelf)
					problems.push('authoriseSelfService is only for the pinned self-service actions');
				if (pinnedSelf && result.guard !== 'authoriseSelfService')
					problems.push('a pinned self-service action must use authoriseSelfService');
			}
			reports.push({ name, problems, guard: result.guard });
		}
		return { reports, errors };
	}

	/* -------------------------------- module level ---------------------------------- */

	/** The names `load` and `actions` stand for in this file, and the const-ness of each link. */
	function protectedNames(sf: ts.SourceFile): { names: Set<string>; problems: string[] } {
		const names = new Set<string>();
		const problems: string[] = [];
		const localNameOf = (exportName: string): string => {
			for (const s of sf.statements) {
				if (
					ts.isExportDeclaration(s) &&
					!s.moduleSpecifier &&
					s.exportClause &&
					ts.isNamedExports(s.exportClause)
				) {
					for (const el of s.exportClause.elements) {
						if (el.name.text === exportName) return (el.propertyName ?? el.name).text;
					}
				}
			}
			return exportName;
		};
		for (const exportName of ['load', 'actions']) {
			let cur = localNameOf(exportName);
			for (let depth = 0; depth < 8; depth++) {
				names.add(cur);
				let next: string | null = null;
				for (const s of sf.statements) {
					if (!ts.isVariableStatement(s)) continue;
					for (const d of s.declarationList.declarations) {
						if (!ts.isIdentifier(d.name) || d.name.text !== cur) continue;
						if (!(s.declarationList.flags & ts.NodeFlags.Const)) {
							problems.push(
								`"${cur}" is not declared with const (what ${exportName} resolves through must not be reassignable)`
							);
						}
						const init = d.initializer ? unwrap(d.initializer) : undefined;
						if (init && ts.isIdentifier(init)) next = init.text;
					}
				}
				if (next === null) break;
				cur = next;
			}
		}
		return { names, problems };
	}

	const ASSIGNMENT_CALLEES =
		/^(Object\.(assign|defineProperty|defineProperties|setPrototypeOf)|Reflect\.(set|defineProperty|deleteProperty|setPrototypeOf))$/;

	function assignmentProblems(sf: ts.SourceFile, names: Set<string>): string[] {
		const problems: string[] = [];
		const rootOf = (e: ts.Node): string | undefined => {
			const x = unwrap(e);
			if (ts.isIdentifier(x)) return x.text;
			if (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x))
				return rootOf(x.expression);
			return undefined;
		};
		const flag = (target: ts.Node, how: string): void => {
			const root = rootOf(target);
			if (root !== undefined && names.has(root)) {
				problems.push(
					`"${root}" is assigned (${how}: ${short(target)}): load, actions and what they resolve through are never reassigned`
				);
			}
		};
		/** Every target an assignment writes: plain, and inside object / array destructuring patterns. */
		const targets = (e: ts.Node, how: string): void => {
			const x = unwrap(e);
			if (ts.isObjectLiteralExpression(x)) {
				for (const p of x.properties) {
					if (ts.isPropertyAssignment(p)) targets(p.initializer, how);
					else if (ts.isShorthandPropertyAssignment(p)) flag(p.name, how);
					else if (ts.isSpreadAssignment(p)) targets(p.expression, how);
				}
			} else if (ts.isArrayLiteralExpression(x)) {
				for (const el of x.elements) targets(el, how);
			} else if (ts.isSpreadElement(x)) {
				targets(x.expression, how);
			} else if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
				targets(x.left, how); // `{ a = 1 }`: a default inside a pattern
			} else flag(x, how);
		};
		const visit = (n: ts.Node): void => {
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
			)
				targets(n.left, 'assignment');
			else if (
				(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
				(n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)
			)
				flag(n.operand, 'increment');
			else if (ts.isDeleteExpression(n)) flag(n.expression, 'delete');
			else if (
				(ts.isForOfStatement(n) || ts.isForInStatement(n)) &&
				!ts.isVariableDeclarationList(n.initializer)
			)
				targets(n.initializer, 'loop target');
			else if (ts.isCallExpression(n) && ASSIGNMENT_CALLEES.test(n.expression.getText())) {
				if (n.arguments[0]) flag(n.arguments[0], n.expression.getText());
			}
			ts.forEachChild(n, visit);
		};
		visit(sf);
		return problems;
	}

	const isLocalSpecifier = (spec: string): boolean => /^(\.|#|\$|\/)/.test(spec);

	function syntaxProblems(sf: ts.SourceFile): string[] {
		const problems: string[] = [];
		for (const s of sf.statements) {
			if (
				ts.isImportDeclaration(s) &&
				!s.importClause &&
				ts.isStringLiteral(s.moduleSpecifier) &&
				isLocalSpecifier(s.moduleSpecifier.text)
			) {
				problems.push(
					`a side-effect import of a local module (${short(s)}) runs that module before any guard`
				);
			}
		}
		const visit = (n: ts.Node): void => {
			const decorators = ts.canHaveDecorators(n) ? ts.getDecorators(n) : undefined;
			if (decorators && decorators.length > 0) {
				problems.push(`a decorator (${short(decorators[0])}) runs code when its class is defined`);
			}
			ts.forEachChild(n, visit);
		};
		visit(sf);
		return problems;
	}

	function moduleProblems(file: string): string[] {
		const sf = sourceFileOf(file);
		const allowed = pinnedCallsOf(sf);
		const problems: string[] = [];
		const { names, problems: constProblems } = protectedNames(sf);
		problems.push(...constProblems, ...assignmentProblems(sf, names), ...syntaxProblems(sf));
		for (const s of sf.statements) {
			const run = firstRun(s, allowed);
			if (!run) continue;
			problems.push(
				run.kind === 'await'
					? `top-level await at module level: ${short(run.node)}`
					: `a call at module level (${short(run.node)}) runs before any guard`
			);
		}
		return problems;
	}

	/* --------------------------------- placement, callees --------------------------------- */

	function placementProblems(file: string, opts: { guardChain?: boolean } = {}): string[] {
		const f = norm(file);
		const appDir = `${ROOT}/src/routes/(app)`;
		if (!f.startsWith(`${appDir}/`)) {
			return [
				'a held server file must live under src/routes/(app)/ (its load chain starts at the guarded layouts there); a new route group needs an explicit decision: pin the file with a reason, or give the group its own guarded layout and extend the contract'
			];
		}
		if (opts.guardChain === false) return [];
		const guardLoad = (candidate: string): boolean =>
			!!program.getSourceFile(candidate) && isSharedGuard(candidate);
		if (guardLoad(f)) return [];
		for (let dir = f.slice(0, f.lastIndexOf('/')); dir.length > appDir.length; ) {
			const layout = `${dir}/+layout.server.ts`;
			if (layout !== f && guardLoad(layout)) return [];
			dir = dir.slice(0, dir.lastIndexOf('/'));
		}
		return [
			'no real guardAppRoute layout load in its directory or above it (below the (app) root layout): `await parent()` there reaches no guard'
		];
	}

	const VALUE_FLAGS =
		ts.SymbolFlags.Function |
		ts.SymbolFlags.Variable |
		ts.SymbolFlags.Class |
		ts.SymbolFlags.RegularEnum;

	function serverCallees(file: string): string[] {
		const sf = sourceFileOf(file);
		const serverDir = `${ROOT}/src/lib/server/`;
		const found = new Set<string>();
		const visit = (n: ts.Node): void => {
			if (ts.isTypeNode(n) || ts.isImportDeclaration(n)) return;
			if (ts.isIdentifier(n)) {
				let sym = checker.getSymbolAtLocation(n);
				if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
				const d = sym?.valueDeclaration;
				if (
					sym &&
					d &&
					sym.flags & VALUE_FLAGS &&
					!ts.isSourceFile(d) &&
					norm(d.getSourceFile().fileName).startsWith(serverDir)
				) {
					found.add(`${rel(d.getSourceFile().fileName)}#${sym.name}`);
				}
			}
			ts.forEachChild(n, visit);
		};
		visit(sf);
		return [...found].sort();
	}

	return {
		program,
		loadProblems,
		actionReports,
		moduleProblems,
		isSharedGuard,
		pinnedHelperProblems,
		placementProblems,
		serverCallees
	};
}
