/**
 * The analysis behind `tests/unit/server/app-server-files.test.ts`: is every server load and form
 * action under `src/routes/(app)` provably guarded? Read from the TypeScript AST and from the real
 * control flow of the top-level statements, never from text and never from source positions alone.
 *
 * LOAD rule. A load that reaches Go (directly, through a local helper it calls, or through a member
 * call such as `tenant.loadTenant()`) must have, BEFORE the first such call, an UNCONDITIONAL
 * TOP-LEVEL statement that awaits the guard: `await parent()` / `const x = await parent()` (or
 * `await guardAppRoute(event)`). Not inside an `if` / `try` / loop, not un-awaited (`void parent()`),
 * not one branch of `Promise.all`.
 *
 * ACTION rule, per ACTION (not per file). The action must have, before the first Go-reaching call,
 * the top-level pair
 *     const refused = await authoriseAction(...);
 *     if (refused) return refused;
 * (the result is used: returned on refusal), or hand off with a top-level `return helper(...)` /
 * `return await helper(...)` where the helper is an authorising helper whose OWN body satisfies the
 * pair. Actions listed as self-service are exempt, exactly, by `<file>#<action>`.
 *
 * `export { load } from './x'`, `export { load }` and `export { actions } from './x'` are followed;
 * `export * from` and a spread inside `actions` are refused (they hide what is exported).
 */
import ts from 'typescript';

/** Calls that reach Go (directly or through a gateway that does). Matched by callee name, member or not. */
export const GO_CALLS = new Set([
	'goFetch',
	'callGoForAction',
	'loadTenant',
	'patchTenant',
	'loadCapabilities',
	'ownPrincipal',
	'fetch'
]);
const GUARD_NAMES = new Set(['parent', 'guardAppRoute']);

export interface LoadedModule {
	sf: ts.SourceFile;
	file: string;
}
/** Resolve a relative module specifier from a file (null when it is not a readable source file). */
export type ModuleLoader = (fromFile: string, specifier: string) => LoadedModule | null;

export type Resolution =
	| { node: ts.Node; sf: ts.SourceFile; file: string }
	| { error: string }
	| null;

const unwrap = (n: ts.Node): ts.Node => {
	let cur = n;
	for (;;) {
		if (
			ts.isParenthesizedExpression(cur) ||
			ts.isAsExpression(cur) ||
			ts.isSatisfiesExpression(cur)
		)
			cur = cur.expression;
		else return cur;
	}
};

const isExported = (node: ts.Node): boolean =>
	ts.canHaveModifiers(node) &&
	(ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** A module-level function or `const f = <function>` by name, exported or not. */
export function findLocal(sf: ts.SourceFile, name: string): ts.Node | null {
	for (const st of sf.statements) {
		if (ts.isFunctionDeclaration(st) && st.name?.text === name) return st;
		if (ts.isVariableStatement(st)) {
			for (const d of st.declarationList.declarations) {
				if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer)
					return unwrap(d.initializer);
			}
		}
	}
	return null;
}

/** What `name` is exported as from this module: a declaration, a re-export (followed), or an error. */
export function resolveExport(
	sf: ts.SourceFile,
	file: string,
	name: string,
	load: ModuleLoader,
	depth = 0
): Resolution {
	if (depth > 4) return { error: `re-export chain of "${name}" is too deep` };
	let star = false;
	for (const st of sf.statements) {
		if (ts.isFunctionDeclaration(st) && isExported(st) && st.name?.text === name)
			return { node: st, sf, file };
		if (ts.isVariableStatement(st) && isExported(st)) {
			for (const d of st.declarationList.declarations) {
				if (ts.isIdentifier(d.name) && d.name.text === name && d.initializer)
					return { node: unwrap(d.initializer), sf, file };
			}
		}
		if (ts.isExportDeclaration(st)) {
			if (!st.exportClause) {
				star = true;
				continue;
			}
			if (!ts.isNamedExports(st.exportClause)) continue;
			for (const el of st.exportClause.elements) {
				if (el.name.text !== name) continue;
				const source = (el.propertyName ?? el.name).text;
				if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
					const mod = load(file, st.moduleSpecifier.text);
					if (!mod) return { error: `"${name}" is re-exported from an unreadable module` };
					return resolveExport(mod.sf, mod.file, source, load, depth + 1);
				}
				const local = findLocal(sf, source);
				return local
					? { node: local, sf, file }
					: { error: `"${name}" is exported but not declared here` };
			}
		}
	}
	return star ? { error: `"${name}" may hide behind \`export * from\` (not followed)` } : null;
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

/** The top-level statements of a function body, or null for an expression body / a non-function. */
function statementsOf(node: ts.Node): readonly ts.Statement[] | null {
	if (!isFnLike(node) || !node.body || !ts.isBlock(node.body)) return null;
	return node.body.statements;
}

interface Call {
	name: string;
	start: number;
	node: ts.CallExpression;
}

/** Every call under `node` (deep, including inside nested closures), by callee name (member or plain). */
function callsIn(node: ts.Node): Call[] {
	const out: Call[] = [];
	const visit = (n: ts.Node) => {
		if (ts.isCallExpression(n)) {
			const callee = unwrap(n.expression);
			if (ts.isIdentifier(callee)) out.push({ name: callee.text, start: n.getStart(), node: n });
			else if (ts.isPropertyAccessExpression(callee))
				out.push({ name: callee.name.text, start: n.getStart(), node: n });
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return out.sort((a, b) => a.start - b.start);
}

/**
 * Calls under `node` that reach Go: a name in GO_CALLS, or a call to a module-level function of this
 * file whose own body makes such a direct call (ONE level of following).
 */
export function goReachingCalls(node: ts.Node, sf: ts.SourceFile): Call[] {
	const reaches = new Map<string, boolean>();
	const localReaches = (name: string): boolean => {
		if (reaches.has(name)) return reaches.get(name)!;
		reaches.set(name, false); // recursion guard
		const fn = findLocal(sf, name);
		const result = fn !== null && isFnLike(fn) && callsIn(fn).some((c) => GO_CALLS.has(c.name));
		reaches.set(name, result);
		return result;
	};
	return callsIn(node).filter((c) => GO_CALLS.has(c.name) || localReaches(c.name));
}

/** `await parent()` / `const x = await parent()` / `await guardAppRoute(e)` as a top-level statement. */
function isGuardStatement(st: ts.Statement): boolean {
	const awaitsGuard = (e: ts.Expression | undefined): boolean => {
		if (!e) return false;
		const x = unwrap(e);
		if (!ts.isAwaitExpression(x)) return false;
		const call = unwrap(x.expression);
		if (!ts.isCallExpression(call)) return false;
		const callee = unwrap(call.expression);
		const name = ts.isIdentifier(callee)
			? callee.text
			: ts.isPropertyAccessExpression(callee)
				? callee.name.text
				: '';
		return GUARD_NAMES.has(name);
	};
	if (ts.isExpressionStatement(st)) return awaitsGuard(st.expression);
	if (ts.isVariableStatement(st))
		return st.declarationList.declarations.some((d) => awaitsGuard(d.initializer));
	return false;
}

/** Violations of the LOAD rule for a resolved `load` (empty when it is provably guarded). */
export function analyzeLoad(node: ts.Node, sf: ts.SourceFile): string[] {
	const n = unwrap(node);
	if (ts.isIdentifier(n)) {
		if (n.text === 'guardAppRoute') return []; // the shared guard itself
		const local = findLocal(sf, n.text);
		return local ? analyzeLoad(local, sf) : [`load is \`${n.text}\`, which is not a known guard`];
	}
	if (!isFnLike(n)) return ['load is not a function the walker can read'];
	const go = goReachingCalls(n, sf);
	if (go.length === 0) return [];
	const statements = statementsOf(n);
	if (!statements)
		return [`load reaches Go (${go[0]!.name}) from an expression body: no guard statement`];
	const guardAt = statements.findIndex(isGuardStatement);
	if (guardAt === -1)
		return [
			`load reaches Go (${go[0]!.name}) with no unconditional top-level \`await parent()\` (not in an if/try/loop, not un-awaited, not inside Promise.all)`
		];
	const guardStart = statements[guardAt]!.getStart();
	const early = go.find((c) => c.start < guardStart);
	return early ? [`load reaches Go (${early.name}) before \`await parent()\``] : [];
}

/** `const X = await authoriseAction(...)` with a top-level `if (X) return X;` after it. -> index after the `if`, or an error. */
function authorisationEnd(
	statements: readonly ts.Statement[]
): { end: number } | { error: string } {
	for (let i = 0; i < statements.length; i++) {
		const st = statements[i]!;
		if (!ts.isVariableStatement(st)) continue;
		const decl = st.declarationList.declarations.find((d) => {
			if (!d.initializer || !ts.isIdentifier(d.name)) return false;
			const init = unwrap(d.initializer);
			if (!ts.isAwaitExpression(init)) return false;
			const call = unwrap(init.expression);
			return (
				ts.isCallExpression(call) &&
				ts.isIdentifier(unwrap(call.expression)) &&
				(unwrap(call.expression) as ts.Identifier).text === 'authoriseAction'
			);
		});
		if (!decl) continue;
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
			error: `the result of authoriseAction (\`${name}\`) is never returned on refusal (\`if (${name}) return ${name};\`)`
		};
	}
	return { error: 'no unconditional top-level `const refused = await authoriseAction(...)`' };
}

/** Violations of the ACTION rule for one action function. */
export function analyzeAction(
	node: ts.Node,
	sf: ts.SourceFile,
	helpers: Record<string, ts.Node | undefined>
): string[] {
	const n = unwrap(node);
	if (!isFnLike(n)) return ['action is not a function the walker can read'];
	const statements = statementsOf(n);
	if (!statements) return ['action has an expression body: no authorisation statement'];
	const go = goReachingCalls(n, sf);

	// The authorising pair in this function ...
	const pair = authorisationEnd(statements);
	if (!('error' in pair)) {
		const early = go.find((c) => c.start < pair.end);
		return early ? [`action reaches Go (${early.name}) before it is authorised`] : [];
	}
	// ... or a top-level hand-off to an authorising helper whose own body has the pair.
	for (const st of statements) {
		if (!ts.isReturnStatement(st) || !st.expression) continue;
		let e = unwrap(st.expression);
		if (ts.isAwaitExpression(e)) e = unwrap(e.expression);
		if (!ts.isCallExpression(e)) continue;
		const callee = unwrap(e.expression);
		if (!ts.isIdentifier(callee) || !(callee.text in helpers)) continue;
		const helper = helpers[callee.text];
		const hs = helper && unwrap(helper);
		if (!hs || !statementsOf(hs)) return [`helper ${callee.text} is not a readable function`];
		// The helper is held to the same rule as an action: its OWN body authorises before it reaches Go.
		const hp = analyzeAction(hs, hs.getSourceFile(), {});
		if (hp.length > 0) return hp.map((p) => `helper ${callee.text}: ${p}`);
		const early = go.find((c) => c.start < st.getStart());
		return early ? [`action reaches Go (${early.name}) before it hands off to ${callee.text}`] : [];
	}
	return [pair.error];
}

/** Every action of an `actions` initializer: name -> function node, or an error for shapes it cannot read. */
export function actionFunctions(
	actions: ts.Node,
	sf: ts.SourceFile
): { fns: Array<{ name: string; node: ts.Node }>; errors: string[] } {
	const fns: Array<{ name: string; node: ts.Node }> = [];
	const errors: string[] = [];
	let obj = unwrap(actions);
	if (ts.isIdentifier(obj)) {
		const local = findLocal(sf, obj.text);
		if (local) obj = unwrap(local);
	}
	if (!ts.isObjectLiteralExpression(obj)) {
		return { fns, errors: ['actions is not an object literal the walker can read'] };
	}
	for (const p of obj.properties) {
		if (ts.isSpreadAssignment(p)) {
			errors.push('actions contains a spread: what it exports is hidden');
			continue;
		}
		const nameNode = p.name;
		const name =
			nameNode && (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode)) ? nameNode.text : '?';
		if (ts.isMethodDeclaration(p)) fns.push({ name, node: p });
		else if (ts.isPropertyAssignment(p)) {
			const init = unwrap(p.initializer);
			if (ts.isIdentifier(init)) {
				const local = findLocal(sf, init.text);
				if (local) fns.push({ name, node: local });
				else
					errors.push(`action "${name}" is \`${init.text}\`, which is not declared in this file`);
			} else fns.push({ name, node: init });
		} else if (ts.isShorthandPropertyAssignment(p)) {
			const local = findLocal(sf, p.name.text);
			if (local) fns.push({ name, node: local });
			else errors.push(`action "${name}" is not declared in this file`);
		}
	}
	return { fns, errors };
}

export interface ActionReport {
	name: string;
	problems: string[];
	selfService: boolean;
}

/** All violations of a file's `actions` (resolved through re-exports by the caller). */
export function analyzeActions(
	resolved: { node: ts.Node; sf: ts.SourceFile },
	helpers: Record<string, ts.Node | undefined>,
	selfService: (action: string) => boolean = () => false
): { reports: ActionReport[]; errors: string[] } {
	const { fns, errors } = actionFunctions(resolved.node, resolved.sf);
	const reports = fns.map(({ name, node }) => {
		const exempt = selfService(name);
		return {
			name,
			selfService: exempt,
			problems: exempt ? [] : analyzeAction(node, resolved.sf, helpers)
		};
	});
	return { reports, errors };
}
