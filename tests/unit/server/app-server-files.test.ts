/**
 * Every server file under `src/routes/(app)` is provably guarded, found by reading the code (the
 * TypeScript AST), not by matching text: a comment that names a guard guards nothing.
 *
 *   1. a `+server.ts` under (app) is a new entry point with no guard in front of it: none may exist
 *      (JSON endpoints live under /api, with their own checks);
 *   2. every `load` awaits `parent()` (the section guard runs there) or calls the shared guard
 *      BEFORE its first call to Go or to a gateway that calls Go;
 *   3. every form action calls `authoriseAction` (directly, or through the one helper that does),
 *      unless the file is on the exactly pinned self-service list below, each with its reason.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(process.cwd(), 'src/routes/(app)');

/** Calls that reach Go (directly or through a gateway that does). */
const GO_CALLS = new Set([
	'goFetch',
	'loadTenant',
	'patchTenant',
	'loadCapabilities',
	'ownPrincipal'
]);
const GUARD_CALLS = new Set(['guardAppRoute']);
/** A helper that authorises on the action's behalf (its own file is checked to call authoriseAction). */
const AUTHORISING_HELPERS: Record<string, string> = {
	saveTenantSection: 'settings/tenant/_actions.ts'
};

/** Server loads that ARE the root of the guard chain: nothing above them awaits anything. */
const LOAD_ROOTS: Record<string, string> = {
	'+layout.server.ts':
		'The (app) layout itself: it loads the capabilities every section guard reads through parent().'
};

/**
 * Action files exempt from `authoriseAction`, EXACTLY. Each acts on the caller's own account (the
 * calls pass scoped:false, so a tenant context never changes their target) and needs no permission
 * beyond being signed in; Go enforces the rest.
 */
const SELF_SERVICE_ACTIONS: Record<string, string> = {
	'must-change-password/+page.server.ts':
		"Sets the caller's own password during the forced change.",
	'settings/account/profile/+page.server.ts':
		"Edits the caller's own profile (their membership, scoped:false).",
	'settings/account/security/+page.server.ts':
		"Changes the caller's own password / requests their own email change (scoped:false)."
};

function files(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]
	);
}
const rel = (file: string) => relative(APP_DIR, file).split(sep).join('/');
const ALL = files(APP_DIR);
const SERVER_FILES = ALL.filter((f) => /\+(page|layout)\.server\.ts$/.test(f));
const parse = (file: string) =>
	ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

function isExported(node: ts.Node): boolean {
	return (
		ts.canHaveModifiers(node) &&
		(ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
	);
}

/** The initializer or function body of `export const load` / `export function load`, or null. */
function exportedLoad(sf: ts.SourceFile): ts.Node | null {
	for (const st of sf.statements) {
		if (ts.isFunctionDeclaration(st) && isExported(st) && st.name?.text === 'load') return st;
		if (ts.isVariableStatement(st) && isExported(st)) {
			for (const d of st.declarationList.declarations) {
				if (ts.isIdentifier(d.name) && d.name.text === 'load' && d.initializer)
					return d.initializer;
			}
		}
	}
	return null;
}

function exportedActions(sf: ts.SourceFile): ts.Node | null {
	for (const st of sf.statements) {
		if (ts.isVariableStatement(st) && isExported(st)) {
			for (const d of st.declarationList.declarations) {
				if (ts.isIdentifier(d.name) && d.name.text === 'actions' && d.initializer)
					return d.initializer;
			}
		}
	}
	return null;
}

/** Identifier of every call in `node`, with its source position, in order. */
function calls(node: ts.Node): Array<{ name: string; pos: number }> {
	const out: Array<{ name: string; pos: number }> = [];
	const visit = (n: ts.Node) => {
		if (ts.isCallExpression(n)) {
			const callee = n.expression;
			if (ts.isIdentifier(callee)) out.push({ name: callee.text, pos: callee.getStart() });
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return out.sort((a, b) => a.pos - b.pos);
}

/** `parent()` called as a function of the load's own event parameter. */
function parentCalls(node: ts.Node): number[] {
	return calls(node)
		.filter((c) => c.name === 'parent')
		.map((c) => c.pos);
}

/** Does the load hand itself to the guard (`export const load = guardAppRoute`)? */
function isGuardItself(load: ts.Node): boolean {
	return ts.isIdentifier(load) && GUARD_CALLS.has(load.text);
}

describe('no unguarded entry points under (app)', () => {
	it('has no +server.ts', () => {
		expect(ALL.filter((f) => f.endsWith('+server.ts')).map(rel)).toEqual([]);
	});
});

describe('every server load awaits the guard before it reaches Go', () => {
	const withLoad = SERVER_FILES.map((f) => ({ f, load: exportedLoad(parse(f)) })).filter(
		(x) => x.load !== null
	);

	it('finds loads to check', () => {
		expect(withLoad.length).toBeGreaterThan(5);
	});

	it.each(withLoad.map((x) => rel(x.f)))('%s', (name) => {
		const entry = withLoad.find((x) => rel(x.f) === name)!;
		const load = entry.load!;
		if (isGuardItself(load)) return;
		if (Object.keys(LOAD_ROOTS).some((suffix) => name === suffix)) return;
		const goCalls = calls(load).filter((c) => GO_CALLS.has(c.name));
		const guardAt = [
			...parentCalls(load),
			...calls(load)
				.filter((c) => GUARD_CALLS.has(c.name))
				.map((c) => c.pos)
		];
		if (goCalls.length === 0) return;
		expect(
			guardAt.length,
			`${name} reaches Go (${goCalls[0]!.name}) without awaiting parent()`
		).toBeGreaterThan(0);
		expect(
			Math.min(...guardAt),
			`${name}: parent() must come before ${goCalls[0]!.name}`
		).toBeLessThan(goCalls[0]!.pos);
	});

	it('the guard recognised is the real export, not a comment that names it', () => {
		const fake = ts.createSourceFile(
			'x.ts',
			'// export const load = guardAppRoute\nexport const other = guardAppRoute;\n',
			ts.ScriptTarget.Latest,
			true
		);
		expect(exportedLoad(fake)).toBeNull();
		const real = ts.createSourceFile(
			'y.ts',
			'export const load = guardAppRoute;\n',
			ts.ScriptTarget.Latest,
			true
		);
		expect(isGuardItself(exportedLoad(real)!)).toBe(true);
	});
});

describe('every form action is authorised', () => {
	const withActions = SERVER_FILES.map((f) => ({ f, actions: exportedActions(parse(f)) })).filter(
		(x) => x.actions !== null
	);

	it('finds the action files', () => {
		expect(withActions.length).toBeGreaterThan(5);
	});

	it('the self-service list is exact: real files with actions, none of which authorises', () => {
		const names = withActions.map((x) => rel(x.f));
		for (const [file, reason] of Object.entries(SELF_SERVICE_ACTIONS)) {
			expect(names, file).toContain(file);
			expect(reason).toBeTruthy();
			const x = withActions.find((w) => rel(w.f) === file)!;
			expect(
				calls(x.actions!).some((c) => c.name === 'authoriseAction'),
				file
			).toBe(false);
		}
	});

	it.each(withActions.map((x) => rel(x.f)).filter((n) => !(n in SELF_SERVICE_ACTIONS)))(
		'%s calls authoriseAction (or the one helper that does)',
		(name) => {
			const x = withActions.find((w) => rel(w.f) === name)!;
			const names = calls(x.actions!).map((c) => c.name);
			const authorises =
				names.includes('authoriseAction') || names.some((n) => n in AUTHORISING_HELPERS);
			expect(authorises, name).toBe(true);
		}
	);

	it('the authorising helpers really call authoriseAction', () => {
		for (const [helper, file] of Object.entries(AUTHORISING_HELPERS)) {
			const path = join(APP_DIR, file);
			expect(existsSync(path), file).toBe(true);
			const names = calls(parse(path)).map((c) => c.name);
			expect(names, `${helper} in ${file}`).toContain('authoriseAction');
		}
	});
});
