/**
 * Every server file under `src/routes/(app)` is provably guarded, found by reading the code (the
 * TypeScript AST and the control flow of the top-level statements), not by matching text: a comment
 * that names a guard guards nothing, and neither does a guard that is conditional, un-awaited or one
 * branch of `Promise.all`. The rules and the analysis live in `tests/support/server-file-guards.ts`;
 * this file applies them to the repository and, below, to synthetic offenders (one per bypass), so a
 * walker that stops catching a bypass fails here.
 *
 *   1. a `+server.ts` under (app) is a new entry point with no guard in front of it: none may exist
 *      (JSON endpoints live under /api, with their own checks);
 *   2. every `load` has an unconditional top-level `await parent()` before its first call that reaches
 *      Go (directly, through a local helper, or as a member call), or is the shared guard itself;
 *   3. every form ACTION (each one, not each file) authorises: the top-level pair
 *      `const refused = await authoriseAction(...); if (refused) return refused;` before any call
 *      that reaches Go, or a hand-off to an authorising helper whose own body has that pair; except
 *      the exactly pinned self-service actions below, each with its reason.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
	analyzeAction,
	analyzeActions,
	analyzeLoad,
	findLocal,
	resolveExport,
	type ModuleLoader
} from '../../support/server-file-guards.ts';

const APP_DIR = join(process.cwd(), 'src/routes/(app)');

/** Helpers that authorise on an action's behalf: name -> [file, exported function]. Each is checked itself. */
const AUTHORISING_HELPERS: Record<string, string> = {
	saveTenantSection: 'settings/tenant/_actions.ts'
};

/** Server loads that ARE the root of the guard chain: nothing above them awaits anything. */
const LOAD_ROOTS: Record<string, string> = {
	'+layout.server.ts':
		'The (app) layout itself: it loads the capabilities every section guard reads through parent().'
};

/**
 * Actions exempt from the PERMISSION part of `authoriseAction`, EXACTLY, keyed `<file>#<action>`. Each
 * acts on the caller's own account (the calls pass scoped:false, so a tenant context never changes
 * their target) and needs no permission beyond being signed in; Go enforces the rest. They are NOT
 * exempt from the page binding: each holds the top-level pair with `authoriseSelfService` (session,
 * then the context fingerprint, which is bound to the person), so a stale page never writes as
 * whoever signed in since.
 */
const SELF_SERVICE_ACTIONS: Record<string, string> = {
	'must-change-password/+page.server.ts#default':
		"Sets the caller's own password during the forced change.",
	'settings/account/profile/+page.server.ts#default':
		"Edits the caller's own profile (their membership, scoped:false).",
	'settings/account/security/+page.server.ts#changePassword':
		"Changes the caller's own password (scoped:false).",
	'settings/account/security/+page.server.ts#changeEmail':
		"Requests the caller's own email change (scoped:false)."
};

function files(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]
	);
}
const rel = (file: string) => relative(APP_DIR, file).split(sep).join('/');
const ALL = files(APP_DIR);
const SERVER_FILES = ALL.filter((f) => /\+(page|layout)\.server\.ts$/.test(f));
const parseText = (file: string, text: string) =>
	ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
const parse = (file: string) => parseText(file, readFileSync(file, 'utf8'));

/** Follow a relative re-export on disk (`./x` -> x.ts or x/index.ts). */
const diskLoader: ModuleLoader = (fromFile, specifier) => {
	if (!specifier.startsWith('.')) return null;
	const base = resolve(dirname(fromFile), specifier);
	for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
		if (existsSync(candidate)) return { sf: parse(candidate), file: candidate };
	}
	return null;
};

const helperNodes = (): Record<string, ts.Node | undefined> =>
	Object.fromEntries(
		Object.entries(AUTHORISING_HELPERS).map(([name, file]) => {
			const path = join(APP_DIR, file);
			return [name, existsSync(path) ? (findLocal(parse(path), name) ?? undefined) : undefined];
		})
	);

describe('no unguarded entry points under (app)', () => {
	it('has no +server.ts', () => {
		expect(ALL.filter((f) => f.endsWith('+server.ts')).map(rel)).toEqual([]);
	});
});

describe('every server load awaits the guard before it reaches Go', () => {
	const loads = SERVER_FILES.map((f) => ({
		f,
		resolved: resolveExport(parse(f), f, 'load', diskLoader)
	})).filter((x) => x.resolved !== null);

	it('finds loads to check', () => {
		expect(loads.length).toBeGreaterThan(5);
	});

	it.each(loads.map((x) => rel(x.f)))('%s', (name) => {
		const { resolved } = loads.find((x) => rel(x.f) === name)!;
		expect(resolved, name).not.toHaveProperty('error');
		if (Object.keys(LOAD_ROOTS).some((suffix) => name === suffix)) return;
		const r = resolved as { node: ts.Node; sf: ts.SourceFile };
		expect(analyzeLoad(r.node, r.sf), name).toEqual([]);
	});
});

describe('every form action is authorised', () => {
	const withActions = SERVER_FILES.map((f) => ({
		f,
		resolved: resolveExport(parse(f), f, 'actions', diskLoader)
	})).filter((x) => x.resolved !== null);

	it('finds the action files', () => {
		expect(withActions.length).toBeGreaterThan(5);
	});

	it.each(withActions.map((x) => rel(x.f)))('%s: each action authorises', (name) => {
		const { resolved } = withActions.find((x) => rel(x.f) === name)!;
		expect(resolved, name).not.toHaveProperty('error');
		const r = resolved as { node: ts.Node; sf: ts.SourceFile };
		const { reports, errors } = analyzeActions(
			r,
			helperNodes(),
			(action) => `${name}#${action}` in SELF_SERVICE_ACTIONS
		);
		expect(errors, name).toEqual([]);
		expect(reports.length, `${name} has actions`).toBeGreaterThan(0);
		for (const report of reports) expect(report.problems, `${name}#${report.name}`).toEqual([]);
	});

	it('the self-service list is exact: real actions, each binds to the page, none checks a permission', () => {
		for (const [key, reason] of Object.entries(SELF_SERVICE_ACTIONS)) {
			const [file, action] = key.split('#') as [string, string];
			expect(reason).toBeTruthy();
			const entry = withActions.find((w) => rel(w.f) === file);
			expect(entry, `${file} has actions`).toBeDefined();
			const r = entry!.resolved as { node: ts.Node; sf: ts.SourceFile };
			// Held to the self-service pair (fingerprint required) ...
			const { reports: held } = analyzeActions(r, helperNodes(), (a) => a === action);
			const found = held.find((x) => x.name === action);
			expect(found, key).toBeDefined();
			expect(found!.problems, key).toEqual([]);
			// ... and exempt only from the permission: it must not be a permission-checked action.
			const { reports } = analyzeActions(r, helperNodes());
			expect(
				reports.find((x) => x.name === action)!.problems.length,
				`${key} is listed but checks a permission`
			).toBeGreaterThan(0);
		}
	});

	it('the authorising helpers are real functions that authorise before reaching Go', () => {
		for (const [name, file] of Object.entries(AUTHORISING_HELPERS)) {
			expect(existsSync(join(APP_DIR, file)), file).toBe(true);
			const node = helperNodes()[name];
			expect(node, `${name} in ${file}`).toBeDefined();
			const sf = parse(join(APP_DIR, file));
			// A helper is checked as an action would be: it must hold the authorising pair itself.
			expect(analyzeAction(node!, sf, {}), name).toEqual([]);
		}
	});
});

/* -------------------------------------------------------------------------------------------- */
/* Self-test: the walker against synthetic offenders, one per bypass. Not the repository.        */
/* -------------------------------------------------------------------------------------------- */

const noLoader: ModuleLoader = () => null;
const synth = (text: string, name = 'load') => {
	const sf = parseText('synthetic.server.ts', text);
	const r = resolveExport(sf, 'synthetic.server.ts', name, noLoader);
	return { sf, r };
};
const loadProblems = (text: string): string[] => {
	const { r } = synth(text, 'load');
	if (!r) return ['no load export'];
	if ('error' in r) return [r.error];
	return analyzeLoad(r.node, r.sf);
};
const actionProblems = (
	text: string,
	helpers: Record<string, ts.Node | undefined> = {}
): string[] => {
	const { r } = synth(text, 'actions');
	if (!r) return ['no actions export'];
	if ('error' in r) return [r.error];
	const { reports, errors } = analyzeActions(r, helpers);
	return [...errors, ...reports.flatMap((x) => x.problems.map((p) => `${x.name}: ${p}`))];
};
const AUTH = 'const refused = await authoriseAction(event, fd, P, v); if (refused) return refused;';

describe('walker self-test: loads', () => {
	it('accepts a load that awaits parent() first', () => {
		expect(
			loadProblems(
				'export const load = async ({ parent }) => { await parent(); await goFetch(); };'
			)
		).toEqual([]);
		expect(
			loadProblems(
				'export async function load({ parent }) { const { x } = await parent(); return loadTenant(x); }'
			)
		).toEqual([]);
		expect(loadProblems('export const load = guardAppRoute;')).toEqual([]);
		expect(loadProblems('export const load = async () => ({ a: 1 });')).toEqual([]);
	});

	it.each([
		['a Go call before parent()', 'await goFetch(); await parent();'],
		['no parent() at all', 'await goFetch();'],
		['parent() inside Promise.all with the Go call', 'await Promise.all([parent(), goFetch()]);'],
		['a conditional parent()', 'if (x) await parent(); await goFetch();'],
		['an un-awaited void parent()', 'void parent(); await goFetch();'],
		['a Go call in a try, guard after', 'try { await goFetch(); } catch {} await parent();'],
		['a member call', 'await tenant.loadTenant(c); await parent();'],
		['parent() in a loop', 'for (const a of b) { await parent(); } await goFetch();']
	])('refuses %s', (_name, body) => {
		const src = `export const load = async ({ parent, cookies }) => { ${body} };`;
		expect(loadProblems(src)).not.toEqual([]);
	});

	it('follows a module-level helper that wraps goFetch (one level)', () => {
		const src = `
			async function fetchAll(c) { return goFetch(c); }
			export const load = async ({ cookies, parent }) => { await fetchAll(cookies); await parent(); };`;
		expect(loadProblems(src)).not.toEqual([]);
		const ok = `
			async function fetchAll(c) { return goFetch(c); }
			export const load = async ({ cookies, parent }) => { await parent(); await fetchAll(cookies); };`;
		expect(loadProblems(ok)).toEqual([]);
	});

	it('follows `export { load }` and refuses a bad one behind it', () => {
		expect(
			loadProblems(
				'const load = async ({ cookies }) => { await goFetch(cookies); }; export { load };'
			)
		).not.toEqual([]);
		expect(
			loadProblems(
				'const load = async ({ parent }) => { await parent(); await goFetch(); }; export { load };'
			)
		).toEqual([]);
	});

	it('follows `export { load } from` through the loader', () => {
		const modules: Record<string, string> = {
			'./bad': 'export const load = async () => { await goFetch(); };',
			'./good': 'export const load = async ({ parent }) => { await parent(); await goFetch(); };'
		};
		const loader: ModuleLoader = (_from, spec) =>
			modules[spec] ? { sf: parseText(spec, modules[spec]), file: spec } : null;
		const through = (spec: string) => {
			const sf = parseText('x.ts', `export { load } from '${spec}';`);
			const r = resolveExport(sf, 'x.ts', 'load', loader);
			return r && !('error' in r) ? analyzeLoad(r.node, r.sf) : ['unresolved'];
		};
		expect(through('./bad')).not.toEqual([]);
		expect(through('./good')).toEqual([]);
		const missing = resolveExport(
			parseText('x.ts', "export { load } from './nope';"),
			'x.ts',
			'load',
			loader
		);
		expect(missing).toHaveProperty('error');
	});

	it('refuses `export *` as a place a load could hide', () => {
		const r = resolveExport(parseText('x.ts', "export * from './a';"), 'x.ts', 'load', noLoader);
		expect(r).toHaveProperty('error');
	});

	it('a comment that names the guard guards nothing', () => {
		expect(
			loadProblems('export const load = async () => { /* await parent() */ await goFetch(); };')
		).not.toEqual([]);
	});
});

describe('walker self-test: actions', () => {
	const good = `export const actions = { a: async (event) => { const fd = await event.request.formData(); ${AUTH} await goFetch(); } };`;

	it('accepts the authorising pair before the Go call', () => {
		expect(actionProblems(good)).toEqual([]);
	});

	it('checks EACH action: one authorised action does not cover its sibling', () => {
		const src = `export const actions = {
			a: async (event) => { ${AUTH} await goFetch(); },
			b: async (event) => { await goFetch(); }
		};`;
		const problems = actionProblems(src);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/^b:/);
	});

	it.each([
		[
			'the result of authoriseAction ignored',
			'await authoriseAction(event, fd, P, v); await goFetch();'
		],
		['authorisation after the Go call', `await goFetch(); ${AUTH}`],
		['a conditional authorisation', `if (x) { ${AUTH} } await goFetch();`],
		[
			'an un-awaited authoriseAction (a Promise is always truthy)',
			'const refused = authoriseAction(event, fd, P, v); if (refused) return refused; await goFetch();'
		],
		[
			'a refusal that is never returned',
			'const refused = await authoriseAction(event, fd, P, v); await goFetch();'
		],
		[
			'a Go call between the call and the check',
			'const refused = await authoriseAction(event, fd, P, v); await goFetch(); if (refused) return refused;'
		],
		['a member Go call with no authorisation', 'await svc.goFetch();']
	])('refuses %s', (_name, body) => {
		expect(
			actionProblems(`export const actions = { a: async (event) => { ${body} } };`)
		).not.toEqual([]);
	});

	it('follows a module-level helper that wraps goFetch', () => {
		const src = `
			async function save(c) { return goFetch(c); }
			export const actions = { a: async (event) => { await save(event.cookies); ${AUTH} } };`;
		expect(actionProblems(src)).not.toEqual([]);
	});

	it('accepts a hand-off to an authorising helper, and refuses one that does not authorise', () => {
		const helper = (body: string) => {
			const sf = parseText('h.ts', `export async function save(event, fd) { ${body} }`);
			return { save: findLocal(sf, 'save') ?? undefined };
		};
		const handOff = 'export const actions = { a: async (event) => { return save(event, fd); } };';
		expect(actionProblems(handOff, helper(`${AUTH} await goFetch();`))).toEqual([]);
		expect(actionProblems(handOff, helper('await goFetch();'))).not.toEqual([]);
		// the helper's FILE calling authoriseAction somewhere is not enough: its own body must
		expect(actionProblems(handOff, helper(`await goFetch(); ${AUTH}`))).not.toEqual([]);
	});

	it('refuses a spread (it hides what is exported) and follows a re-export', () => {
		expect(actionProblems('export const actions = { ...other };')).not.toEqual([]);
		const loader: ModuleLoader = () => ({
			sf: parseText('./x', 'export const actions = { a: async () => { await goFetch(); } };'),
			file: './x'
		});
		const r = resolveExport(
			parseText('y.ts', "export { actions } from './x';"),
			'y.ts',
			'actions',
			loader
		);
		expect(r && !('error' in r) ? analyzeActions(r, {}).reports[0]!.problems : []).not.toEqual([]);
	});

	it('a self-service exemption drops the permission, never the page binding', () => {
		const SELF =
			'const refused = await authoriseSelfService(event, fd, v); if (refused) return refused;';
		const res = (body: string) =>
			synth(`export const actions = { a: async (event) => { ${body} } };`, 'actions').r as {
				node: ts.Node;
				sf: ts.SourceFile;
			};
		const problems = (body: string, exempt: string) =>
			analyzeActions(res(body), {}, (n) => n === exempt).reports[0]!.problems;
		// the exact pair, before Go
		expect(problems(`${SELF} await goFetch();`, 'a')).toEqual([]);
		// exempt by name only: another action of the same name is still held to authoriseAction
		expect(problems(`${SELF} await goFetch();`, 'b')).not.toEqual([]);
		// a self-service action with no binding at all, or with the binding after Go, is refused
		expect(problems('await goFetch();', 'a')).not.toEqual([]);
		expect(problems(`await goFetch(); ${SELF}`, 'a')).not.toEqual([]);
		// authoriseAction does not stand in for the self-service guard (and the reverse)
		expect(problems(`${AUTH} await goFetch();`, 'a')).not.toEqual([]);
		expect(
			actionProblems(`export const actions = { a: async (event) => { ${SELF} await goFetch(); } };`)
		).not.toEqual([]);
	});
});
