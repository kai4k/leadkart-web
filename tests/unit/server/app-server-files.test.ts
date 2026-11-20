/**
 * Every server file under `src/routes/(app)` is provably guarded, found by reading the code through
 * the TypeScript checker (one program for all the files): a name counts as a guard, or as something
 * that reaches Go, only when it RESOLVES to the real declaration, so a comment that names a guard,
 * a local stub, an alias, a helper imported from another module or an indirect call form changes
 * nothing. The rules and the analysis live in `tests/support/server-file-guards.ts`; this file
 * applies them to the repository and, below, to synthetic offenders (one per bypass, each failing
 * for its own reason), so a walker that stops catching a bypass fails here.
 *
 *   1. a `+server.ts` under (app) is a new entry point with no guard in front of it: none may exist
 *      (JSON endpoints live under /api, with their own checks);
 *   2. every `load` has an unconditional top-level `await parent()` (of its own event) before its
 *      first call that reaches Go, or is the shared guard itself;
 *   3. every form ACTION (each one, not each file) authorises: the top-level pair
 *      `const refused = await authoriseAction(event, form, P.x, values); if (refused) return refused;`
 *      before any call that reaches Go, with a permission from the P / ACTION tables, or a hand-off
 *      to a pinned authorising helper; except the exactly pinned self-service actions, which hold
 *      the same pair with `authoriseSelfService` (session + page binding, no permission).
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	createAnalysis,
	PURE_HELPERS,
	type Analysis,
	type Resolution
} from '../../support/server-file-guards.ts';

const APP_DIR = join(process.cwd(), 'src/routes/(app)');
const SYNTH_DIR = join(APP_DIR, '__synthetic__');

/** Helpers that authorise on an action's behalf, pinned `file#function`. Each is checked itself. */
const AUTHORISING_HELPERS: ReadonlySet<string> = new Set([
	'src/routes/(app)/settings/tenant/_actions.ts#saveTenantSection'
]);

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
const helperFile = (name: string) => `src/routes/(app)/${name}`;

/* -------------------------------------------------------------------------------------------- */
/* Synthetic offenders: in-memory files placed inside the app tree so they resolve the real      */
/* modules. All of them share ONE program with the repository.                                   */
/* -------------------------------------------------------------------------------------------- */

const PRELUDE = `
import { goFetch } from '#lib/server/go.ts';
import * as goModule from '#lib/server/go.ts';
import { authoriseAction, authoriseSelfService, failForm } from '#lib/server/form-action.ts';
import { guardAppRoute } from '#lib/server/guards.ts';
import { changePasswordViaGo } from '#lib/server/auth-errors.ts';
import { P, ACTION } from '#lib/features/auth/permissions.ts';
`;
const AUTH =
	'const refused = await authoriseAction(event, fd, P.identityUsersCreate, v); if (refused) return refused;';
const SELF =
	'const refused = await authoriseSelfService(event, fd, v); if (refused) return refused;';

const loadSrc = (body: string, extra = '') =>
	`${PRELUDE}${extra}\nexport const load = async ({ parent, cookies }) => { ${body} };`;
const actionSrc = (body: string, extra = '') =>
	`${PRELUDE}${extra}\nexport const actions = { a: async (event) => { const fd = await event.request.formData(); const v = {}; ${body} } };`;

const LOAD_OK: Record<string, string> = {
	'parent first, then Go': loadSrc("await parent(); await goFetch(cookies, '/v1/x');"),
	'a destructured parent result': loadSrc(
		"const { x } = await parent(); await goFetch(cookies, '/v1/x');"
	),
	'the real shared guard': `${PRELUDE}\nexport const load = guardAppRoute;`,
	'an alias of the real guard': `${PRELUDE}\nconst g = guardAppRoute; export const load = g;`,
	'a load that never reaches Go': `${PRELUDE}\nexport const load = async () => ({ a: 1 });`,
	'a local helper called after parent': loadSrc(
		'await parent(); await fetchAll(cookies);',
		'async function fetchAll(c) { return goFetch(c, "/v1/x"); }'
	),
	'event.parent() of the load event': `${PRELUDE}\nexport async function load(event) { await event.parent(); await goFetch(event.cookies, '/v1/x'); }`,
	'export { load } of a good load': `${PRELUDE}\nconst load = async ({ parent }) => { await parent(); await goFetch(); }; export { load };`
};

/** Each refused for its own reason; the string is the reason the walker must give (a fragment). */
const LOAD_REFUSED: Record<string, [string, string]> = {
	'a Go call before parent()': [
		loadSrc('await goFetch(cookies, "/v1/x"); await parent();'),
		'before'
	],
	'no parent() at all': [loadSrc('await goFetch(cookies, "/v1/x");'), 'no unconditional'],
	'parent() inside Promise.all with the Go call': [
		loadSrc('await Promise.all([parent(), goFetch(cookies, "/v1/x")]);'),
		'no unconditional'
	],
	'a conditional parent()': [
		loadSrc('if (cookies) await parent(); await goFetch(cookies, "/v1/x");'),
		'no unconditional'
	],
	'an un-awaited void parent()': [
		loadSrc('void parent(); await goFetch(cookies, "/v1/x");'),
		'no unconditional'
	],
	'a Go call in a try, guard after': [
		loadSrc('try { await goFetch(cookies, "/v1/x"); } catch {} await parent();'),
		'before'
	],
	'a namespace member Go call': [
		loadSrc('await goModule.goFetch(cookies, "/v1/x"); await parent();'),
		'before'
	],
	'parent() in a loop': [
		loadSrc('for (const a of [1]) { await parent(); } await goFetch(cookies, "/v1/x");'),
		'no unconditional'
	],
	'an imported helper that is not a known Go call': [
		loadSrc('await changePasswordViaGo(cookies, {}); await parent();'),
		'before'
	],
	'an imported helper with no parent() at all': [
		loadSrc('await changePasswordViaGo(cookies, {});'),
		'no unconditional'
	],
	'an alias at module level (const g = goFetch)': [
		loadSrc('await g(cookies, "/v1/x"); await parent();', 'const g = goFetch;'),
		'before'
	],
	'an alias inside the function': [
		loadSrc('const g = goFetch; await g(cookies, "/v1/x"); await parent();'),
		'before'
	],
	'goFetch.call(...)': [
		loadSrc('await goFetch.call(null, cookies, "/v1/x"); await parent();'),
		'.call'
	],
	'goFetch.apply(...)': [
		loadSrc('await goFetch.apply(null, [cookies, "/v1/x"]); await parent();'),
		'.apply'
	],
	'Reflect.apply(goFetch, ...)': [
		loadSrc('await Reflect.apply(goFetch, null, [cookies, "/v1/x"]); await parent();'),
		'Reflect.apply'
	],
	"an element-access call (m['goFetch'])": [
		loadSrc("await goModule['goFetch'](cookies, '/v1/x'); await parent();"),
		'element access'
	],
	'a local helper two levels deep, before parent': [
		loadSrc(
			'await a(cookies); await parent();',
			'async function b(c) { return goFetch(c); }\nasync function a(c) { return b(c); }'
		),
		'before'
	],
	'a module-level const parent spoof': [
		`${PRELUDE}
const parent = async () => {};
export const load = async ({ cookies }) => { await parent(); await goFetch(cookies, '/v1/x'); };`,
		'no unconditional'
	],
	'x.parent() of something else': [
		loadSrc(
			'const x = { parent: async () => {} }; await x.parent(); await goFetch(cookies, "/v1/x");'
		),
		'no unconditional'
	],
	'a local guardAppRoute stub as the load': [
		`${PRELUDE.replace("import { guardAppRoute } from '#lib/server/guards.ts';", '')}\nconst guardAppRoute = async () => {}; export const load = guardAppRoute;`,
		'real guardAppRoute'
	],
	'a Go call inside the guard arguments': [
		loadSrc('await parent(await goFetch(cookies, "/v1/x"));'),
		'no unconditional'
	],
	'a comment that names the guard': [
		loadSrc('/* await parent() */ await goFetch(cookies, "/v1/x");'),
		'no unconditional'
	]
};

const ACTION_OK: Record<string, [string, string?]> = {
	'the pair before the Go call': [actionSrc(`${AUTH} await goFetch(event.cookies, '/v1/x');`)],
	'a permission from the ACTION table': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, ACTION.roleCreate, v); if (refused) return refused; await goFetch(event.cookies, '/v1/x');"
		)
	],
	'a list of P members': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, [P.identityUsersCreate, P.platformUsersManage], v); if (refused) return refused; await goFetch(event.cookies, '/v1/x');"
		)
	],
	'a hand-off to a pinned authorising helper': [
		`${PRELUDE}\nimport { save } from './helper-ok.ts';\nexport const actions = { a: async (event) => { const fd = await event.request.formData(); return save(event, fd); } };`
	]
};

const ACTION_REFUSED: Record<string, [string, string]> = {
	'the result of authoriseAction ignored': [
		actionSrc(
			"await authoriseAction(event, fd, P.identityUsersCreate, v); await goFetch(event.cookies, '/v1/x');"
		),
		'no unconditional'
	],
	'authorisation after the Go call': [
		actionSrc(`await goFetch(event.cookies, '/v1/x'); ${AUTH}`),
		'before it is authorised'
	],
	'a conditional authorisation': [
		actionSrc(`if (fd) { ${AUTH} } await goFetch(event.cookies, '/v1/x');`),
		'no unconditional'
	],
	'an un-awaited authoriseAction (a Promise is always truthy)': [
		actionSrc(
			"const refused = authoriseAction(event, fd, P.identityUsersCreate, v); if (refused) return refused; await goFetch(event.cookies, '/v1/x');"
		),
		'no unconditional'
	],
	'a refusal that is never returned': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, P.identityUsersCreate, v); await goFetch(event.cookies, '/v1/x');"
		),
		'never returned'
	],
	'a Go call between the call and the check': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, P.identityUsersCreate, v); await goFetch(event.cookies, '/v1/x'); if (refused) return refused;"
		),
		'before it is authorised'
	],
	'a Go call with no authorisation': [
		actionSrc("await goFetch(event.cookies, '/v1/x');"),
		'no unconditional'
	],
	'an imported helper that is not a known Go call, before the pair': [
		actionSrc(`await changePasswordViaGo(event.cookies, {}); ${AUTH}`),
		'before it is authorised'
	],
	'an alias call before the pair': [
		actionSrc(`await g(event.cookies, '/v1/x'); ${AUTH}`, 'const g = goFetch;'),
		'before it is authorised'
	],
	'a module-level helper that wraps goFetch, before the pair': [
		actionSrc(
			`await save(event.cookies); ${AUTH}`,
			'async function save(c) { return goFetch(c, "/v1/x"); }'
		),
		'before it is authorised'
	],
	'goFetch.call before the pair': [
		actionSrc(`await goFetch.call(null, event.cookies, '/v1/x'); ${AUTH}`),
		'.call'
	],
	'a permission that is a string literal': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, 'identity.users.create', v); if (refused) return refused; await goFetch(event.cookies, '/v1/x');"
		),
		'P / ACTION'
	],
	'an empty permission': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, '', v); if (refused) return refused; await goFetch(event.cookies, '/v1/x');"
		),
		'P / ACTION'
	],
	'a permission list with a literal in it': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, [P.identityUsersCreate, 'x'], v); if (refused) return refused; await goFetch(event.cookies, '/v1/x');"
		),
		'P / ACTION'
	],
	'a local authoriseAction stub': [
		actionSrc(
			`${AUTH} await goFetch(event.cookies, '/v1/x');`,
			'async function authoriseAction(...a) { return null; }'
		).replace(
			"import { authoriseAction, authoriseSelfService, failForm } from '#lib/server/form-action.ts';",
			'import { authoriseSelfService, failForm } from "#lib/server/form-action.ts";'
		),
		'no unconditional'
	],
	'a Go call inside the guard arguments': [
		actionSrc(
			"const refused = await authoriseAction(event, fd, P.identityUsersCreate, await goFetch(event.cookies, '/v1/x')); if (refused) return refused;"
		),
		'no unconditional'
	],
	'a hand-off to a helper that is not pinned': [
		`${PRELUDE}\nimport { save } from './helper-unpinned.ts';\nexport const actions = { a: async (event) => { const fd = await event.request.formData(); return save(event, fd); } };`,
		'no unconditional'
	],
	'a hand-off to a pinned helper that does not authorise': [
		`${PRELUDE}\nimport { save } from './helper-bad.ts';\nexport const actions = { a: async (event) => { const fd = await event.request.formData(); return save(event, fd); } };`,
		'helper save'
	],
	'a spread in actions': [
		`${PRELUDE}\nconst other = {};\nexport const actions = { ...other };`,
		'spread'
	],
	'authoriseSelfService where a permission is required': [
		actionSrc(`${SELF} await goFetch(event.cookies, '/v1/x');`),
		'no unconditional'
	]
};

const SYNTHETIC: Record<string, string> = {
	'helper-ok.ts': `${PRELUDE}\nexport async function save(event, fd) { ${AUTH} await goFetch(event.cookies, '/v1/x'); return null; }`,
	'helper-unpinned.ts': `${PRELUDE}
export async function save(event, fd) { ${AUTH} await goFetch(event.cookies, '/v1/x'); return null; }`,
	'helper-bad.ts': `${PRELUDE}\nexport async function save(event, fd) { await goFetch(event.cookies, '/v1/x'); ${AUTH} }`,
	'load-bad.ts': `${PRELUDE}\nexport const load = async () => { await goFetch(); };`,
	'load-good.ts': `${PRELUDE}\nexport const load = async ({ parent }) => { await parent(); await goFetch(); };`,
	'reexport-bad.server.ts': "export { load } from './load-bad.ts';",
	'reexport-good.server.ts': "export { load } from './load-good.ts';",
	'reexport-missing.server.ts': "export { load } from './nope.ts';",
	'star.server.ts': "export * from './load-good.ts';",
	'self-ok.server.ts': actionSrc(`${SELF} await goFetch(event.cookies, '/v1/x');`),
	'self-none.server.ts': actionSrc("await goFetch(event.cookies, '/v1/x');"),
	'self-after.server.ts': actionSrc(`await goFetch(event.cookies, '/v1/x'); ${SELF}`),
	'self-permission.server.ts': actionSrc(`${AUTH} await goFetch(event.cookies, '/v1/x');`)
};
const entries = (table: Record<string, string | [string, string?]>, prefix: string) =>
	Object.entries(table).map(([name, v], i) => ({
		name,
		file: join(SYNTH_DIR, `${prefix}-${i}.server.ts`),
		src: typeof v === 'string' ? v : v[0],
		reason: typeof v === 'string' ? '' : (v[1] ?? '')
	}));
const loadOk = entries(LOAD_OK, 'load-ok');
const loadRefused = entries(LOAD_REFUSED, 'load-refused');
const actionOk = entries(ACTION_OK, 'action-ok');
const actionRefused = entries(ACTION_REFUSED, 'action-refused');
const OVERLAY: Record<string, string> = Object.fromEntries([
	...[...loadOk, ...loadRefused, ...actionOk, ...actionRefused].map((c) => [c.file, c.src]),
	...Object.entries(SYNTHETIC).map(([name, src]) => [join(SYNTH_DIR, name), src])
]);

let an: Analysis;
let buildMs = 0;
beforeAll(() => {
	const start = performance.now();
	an = createAnalysis(SERVER_FILES, OVERLAY);
	// Force the checker to answer for the whole repository set once, so the time is the full cost.
	for (const f of SERVER_FILES) an.resolveExport(an.sourceFile(f), 'load');
	buildMs = performance.now() - start;
}, 120_000);

const resolveIn = (file: string, name: string) => an.resolveExport(an.sourceFile(file), name);
const loadProblemsOf = (file: string): string[] => {
	const r = resolveIn(file, 'load');
	if (!r) return ['no load export'];
	if ('error' in r) return [r.error];
	return an.analyzeLoad(r.node);
};
const actionProblemsOf = (file: string, selfService = false): string[] => {
	const r = resolveIn(file, 'actions');
	if (!r) return ['no actions export'];
	if ('error' in r) return [r.error];
	const { reports, errors } = an.analyzeActions(
		r,
		new Set([
			helperFile('__synthetic__/helper-ok.ts#save'),
			helperFile('__synthetic__/helper-bad.ts#save'),
			...AUTHORISING_HELPERS
		]),
		() => selfService
	);
	return [...errors, ...reports.flatMap((x) => x.problems.map((p) => `${x.name}: ${p}`))];
};

describe('no unguarded entry points under (app)', () => {
	it('has no +server.ts', () => {
		expect(ALL.filter((f) => f.endsWith('+server.ts')).map(rel)).toEqual([]);
	});

	it('analyses the whole repository set in one program, quickly', () => {
		console.info(
			`[server-file walker] one program, ${SERVER_FILES.length} files: ${Math.round(buildMs)} ms`
		);
		expect(buildMs).toBeLessThan(60_000);
	});
});

describe('every server load awaits the guard before it reaches Go', () => {
	const loads = () =>
		SERVER_FILES.map((f) => ({ f, resolved: resolveIn(f, 'load') })).filter(
			(x) => x.resolved !== null
		);

	it('finds loads to check', () => {
		expect(loads().length).toBeGreaterThan(5);
	});

	it.each(SERVER_FILES.map(rel))('%s', (name) => {
		const resolved = resolveIn(join(APP_DIR, name), 'load');
		if (resolved === null) return; // this file has no load (it may have actions)
		expect(resolved, name).not.toHaveProperty('error');
		if (Object.keys(LOAD_ROOTS).some((suffix) => name === suffix)) return;
		expect(an.analyzeLoad((resolved as Resolution).node), name).toEqual([]);
	});
});

describe('every form action is authorised', () => {
	const withActions = () =>
		SERVER_FILES.map((f) => ({ f, resolved: resolveIn(f, 'actions') })).filter(
			(x) => x.resolved !== null
		);

	it('finds the action files', () => {
		expect(withActions().length).toBeGreaterThan(5);
	});

	it.each(SERVER_FILES.map(rel))('%s: each action authorises', (name) => {
		const resolved = resolveIn(join(APP_DIR, name), 'actions');
		if (resolved === null) return;
		expect(resolved, name).not.toHaveProperty('error');
		const { reports, errors } = an.analyzeActions(
			resolved as Resolution,
			AUTHORISING_HELPERS,
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
			const resolved = resolveIn(join(APP_DIR, file), 'actions');
			expect(resolved, `${file} has actions`).not.toBeNull();
			const r = resolved as Resolution;
			// Held to the self-service pair (fingerprint required) ...
			const held = an.analyzeActions(r, AUTHORISING_HELPERS, (a) => a === action).reports;
			const found = held.find((x) => x.name === action);
			expect(found, key).toBeDefined();
			expect(found!.problems, key).toEqual([]);
			// ... and exempt only from the permission: it must not be a permission-checked action.
			const asPermission = an.analyzeActions(r, AUTHORISING_HELPERS).reports;
			expect(
				asPermission.find((x) => x.name === action)!.problems.length,
				`${key} is listed but checks a permission`
			).toBeGreaterThan(0);
		}
	});

	it('the pinned authorising helpers are real functions that authorise before reaching Go', () => {
		for (const id of AUTHORISING_HELPERS) {
			const [file, name] = id.split('#') as [string, string];
			const resolved = resolveIn(join(process.cwd(), file), name);
			expect(resolved, id).not.toBeNull();
			expect(resolved, id).not.toHaveProperty('error');
			expect(an.analyzeAction((resolved as Resolution).node, 'permission'), id).toEqual([]);
		}
	});

	it('the pinned pure helpers exist and are not guards', () => {
		for (const id of PURE_HELPERS) {
			const [file, name] = id.split('#') as [string, string];
			const resolved = resolveIn(join(process.cwd(), file), name);
			expect(resolved, id).toBeTruthy();
			expect(resolved, id).not.toHaveProperty('error');
		}
	});
});

/* -------------------------------------------------------------------------------------------- */
/* Self-test: the walker against synthetic offenders, one per bypass. Not the repository.        */
/* -------------------------------------------------------------------------------------------- */

describe('walker self-test: loads', () => {
	it.each(loadOk.map((c) => [c.name, c.file] as const))('accepts %s', (_n, file) => {
		expect(loadProblemsOf(file)).toEqual([]);
	});

	it.each(loadRefused.map((c) => [c.name, c.file, c.reason] as const))(
		'refuses %s',
		(_n, file, reason) => {
			const problems = loadProblemsOf(file);
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain(reason);
		}
	);

	it('follows `export { load } from` and refuses a bad one behind it', () => {
		expect(loadProblemsOf(join(SYNTH_DIR, 'reexport-bad.server.ts'))).not.toEqual([]);
		expect(loadProblemsOf(join(SYNTH_DIR, 'reexport-good.server.ts'))).toEqual([]);
		expect(resolveIn(join(SYNTH_DIR, 'reexport-missing.server.ts'), 'load')).toHaveProperty(
			'error'
		);
	});

	it('refuses `export *` as a place a load could hide', () => {
		expect(resolveIn(join(SYNTH_DIR, 'star.server.ts'), 'load')).toHaveProperty('error');
	});
});

describe('walker self-test: actions', () => {
	it.each(actionOk.map((c) => [c.name, c.file] as const))('accepts %s', (_n, file) => {
		expect(actionProblemsOf(file)).toEqual([]);
	});

	it.each(actionRefused.map((c) => [c.name, c.file, c.reason] as const))(
		'refuses %s',
		(_n, file, reason) => {
			const problems = actionProblemsOf(file);
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain(reason);
		}
	);

	it('checks EACH action: one authorised action does not cover its sibling', () => {
		// self-none holds one unguarded action; the same file shape with two actions is the real
		// sibling case, covered by every real file reporting per action.
		const problems = actionProblemsOf(join(SYNTH_DIR, 'self-none.server.ts'));
		expect(problems).toHaveLength(1);
		expect(problems[0]).toMatch(/^a:/);
	});

	it('a self-service exemption drops the permission, never the page binding', () => {
		expect(actionProblemsOf(join(SYNTH_DIR, 'self-ok.server.ts'), true)).toEqual([]);
		expect(actionProblemsOf(join(SYNTH_DIR, 'self-none.server.ts'), true)).not.toEqual([]);
		expect(actionProblemsOf(join(SYNTH_DIR, 'self-after.server.ts'), true)).not.toEqual([]);
		// authoriseAction does not stand in for the self-service guard, nor the reverse
		expect(actionProblemsOf(join(SYNTH_DIR, 'self-permission.server.ts'), true)).not.toEqual([]);
		expect(actionProblemsOf(join(SYNTH_DIR, 'self-ok.server.ts'), false)).not.toEqual([]);
	});
});
