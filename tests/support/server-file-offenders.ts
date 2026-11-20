/**
 * Synthetic server route files for the walker's self-test: GOOD ones it must accept and OFFENDERS it
 * must refuse, one per way past a guard the reviews found. In-memory sources placed inside the app
 * tree (so they resolve the real modules); never part of the repository. Each offender does
 * something BEFORE its guard (or has a guard of the wrong shape): the positional contract refuses it
 * without classifying what the something is.
 */
import { join } from 'node:path';

export const SYNTH_DIR = join(process.cwd(), 'src/routes/(app)/__synthetic__');
/** A module outside every "server" location: a helper that reaches Go from there. */
export const NON_SERVER_MODULE = join(process.cwd(), 'src/lib/utils/__synthetic_reach.ts');

export const PRELUDE = `
import { goFetch } from '#lib/server/go.ts';
import * as goModule from '#lib/server/go.ts';
import { authoriseAction, authoriseSelfService, failForm } from '#lib/server/form-action.ts';
import { guardAppRoute } from '#lib/server/guards.ts';
import { changePasswordViaGo } from '#lib/server/auth-errors.ts';
import { P, ACTION } from '#lib/features/auth/permissions.ts';
import { saveTenantSection } from '../settings/tenant/_actions.ts';
import { reach } from '#lib/utils/__synthetic_reach.ts';
`;

const loadSrc = (body: string, extra = '', params = '{ parent, cookies }') =>
	`${PRELUDE}${extra}\nexport const load = async (${params}) => { ${body} };`;

/** The action source: `body` is the whole action body (the contract is about its first statements). */
const actionSrc = (body: string, extra = '', params = 'event') =>
	`${PRELUDE}${extra}\nexport const actions = { a: async (${params}) => { ${body} } };`;

const FD = 'const fd = await event.request.formData();';
const AUTH =
	'const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); if (refused) return refused;';
const SELF =
	'const refused = await authoriseSelfService(event, fd, () => ({})); if (refused) return refused;';
const GO = "await goFetch(event.cookies, '/v1/x');";

export interface Offender {
	name: string;
	src: string;
	/** A fragment of the reason the walker must give (refused cases only). */
	reason: string;
}

type Table = Record<string, string | [string, string]>;
const toList = (table: Table): Offender[] =>
	Object.entries(table).map(([name, v]) => ({
		name,
		src: typeof v === 'string' ? v : v[0],
		reason: typeof v === 'string' ? '' : v[1]
	}));

const LOAD_START = 'await parent()';

export const LOAD_OK: Offender[] = toList({
	'parent first, then Go': loadSrc("await parent(); await goFetch(cookies, '/v1/x');"),
	'a destructured parent result': loadSrc(
		"const { x } = await parent(); await goFetch(cookies, '/v1/x');"
	),
	'a plain const parent result': loadSrc(
		"const p = await parent(); await goFetch(cookies, '/v1/x');"
	),
	'the real shared guard': `${PRELUDE}\nexport const load = guardAppRoute;`,
	'an alias of the real guard': `${PRELUDE}\nconst g = guardAppRoute; export const load = g;`,
	'a load that returns data after the guard': loadSrc('await parent(); return { a: 1 };'),
	'event.parent() of the load event': `${PRELUDE}\nexport async function load(event) { await event.parent(); await goFetch(event.cookies, '/v1/x'); }`,
	'a function declaration with a destructured parent': `${PRELUDE}\nexport async function load({ parent }) { await parent(); await goFetch(); }`,
	'a default parameter without a call': loadSrc('await parent();', '', '{ parent }, extra = 1')
});

export const LOAD_REFUSED: Offender[] = toList({
	'a Go call before parent()': [
		loadSrc('await goFetch(cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	'no parent() at all': [loadSrc('await goFetch(cookies, "/v1/x");'), LOAD_START],
	'an empty load': [loadSrc(''), LOAD_START],
	'parent() inside Promise.all with the Go call': [
		loadSrc('await Promise.all([parent(), goFetch(cookies, "/v1/x")]);'),
		LOAD_START
	],
	'a conditional parent()': [
		loadSrc('if (cookies) await parent(); await goFetch(cookies, "/v1/x");'),
		LOAD_START
	],
	'an un-awaited void parent()': [
		loadSrc('void parent(); await goFetch(cookies, "/v1/x");'),
		LOAD_START
	],
	'parent() in a try': [
		loadSrc('try { await parent(); } catch {} await goFetch(cookies, "/v1/x");'),
		LOAD_START
	],
	'parent() in a loop': [
		loadSrc('for (const a of [1]) { await parent(); } await goFetch(cookies, "/v1/x");'),
		LOAD_START
	],
	'a statement of no consequence before parent()': [
		loadSrc('const a = 1; await parent();'),
		LOAD_START
	],
	'an expression body': [`${PRELUDE}\nexport const load = ({ parent }) => parent();`, LOAD_START],
	'a module-level const parent spoof': [
		`${PRELUDE}\nconst parent = async () => {};\nexport const load = async ({ cookies }) => { await parent(); await goFetch(cookies, '/v1/x'); };`,
		LOAD_START
	],
	'x.parent() of something else': [
		loadSrc(
			'const x = { parent: async () => {} }; await x.parent(); await goFetch(cookies, "/v1/x");'
		),
		LOAD_START
	],
	'a renamed local that holds parent': [
		loadSrc('const parent2 = parent; await parent2();'),
		LOAD_START
	],
	'a local guardAppRoute stub as the load': [
		`${PRELUDE.replace("import { guardAppRoute } from '#lib/server/guards.ts';", '')}\nconst guardAppRoute = async () => {}; export const load = guardAppRoute;`,
		'guardAppRoute'
	],
	'a call in the guard arguments': [
		loadSrc('await parent(await goFetch(cookies, "/v1/x"));'),
		LOAD_START
	],
	'a comment that names the guard': [
		loadSrc('/* await parent() */ await goFetch(cookies, "/v1/x");'),
		LOAD_START
	],
	'a call in a default parameter before the guard': [
		loadSrc('await parent();', '', '{ parent }, extra = goFetch()'),
		'before'
	],
	'a call in a destructuring default of the event': [
		loadSrc('await parent();', '', '{ parent, cookies = goFetch() }'),
		'before'
	],
	// The shapes the review found past the old walker: each hides a Go call before the guard.
	'(a) a helper in a module outside every server location': [
		loadSrc('await reach(cookies); await parent();'),
		LOAD_START
	],
	'(b) a comma callee': [
		loadSrc('await (0, goFetch)(cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	'(c) a conditional callee': [
		loadSrc('await (cookies ? goFetch : goFetch)(cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	'(d) an angle-bracket assertion': [
		loadSrc('await (<any>goFetch)(cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	'(e) a destructured alias': [
		loadSrc('const { goFetch: g } = goModule; await g(cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	'(f) an element-access alias': [
		loadSrc('const g = goModule["goFetch"]; await g(cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	'(g) a module-level .bind': [
		loadSrc('await bound(cookies, "/v1/x"); await parent();', 'const bound = goFetch.bind(null);'),
		LOAD_START
	],
	'(h) an arrow in an object property': [
		loadSrc(
			'await o.run(cookies); await parent();',
			'const o = { run: (c) => goFetch(c, "/v1/x") };'
		),
		LOAD_START
	],
	'(h2) an arrow in a class property': [
		loadSrc(
			'await new H().run(cookies); await parent();',
			'class H { run = (c) => goFetch(c, "/v1/x"); }'
		),
		LOAD_START
	],
	'(i) a function passed as a value': [
		loadSrc('await Promise.all([1].map(() => goFetch(cookies, "/v1/x"))); await parent();'),
		LOAD_START
	],
	'(j) new': [
		loadSrc(
			'await new Reach(cookies).go(); await parent();',
			'class Reach { c; constructor(c) { this.c = c; } go() { return goFetch(this.c, "/v1/x"); } }'
		),
		LOAD_START
	],
	'(k) a tagged template': [
		loadSrc('await tag`x`; await parent();', 'const tag = (s) => goFetch(s);'),
		LOAD_START
	],
	'an alias at module level (const g = goFetch)': [
		loadSrc('await g(cookies, "/v1/x"); await parent();', 'const g = goFetch;'),
		LOAD_START
	],
	'goFetch.call(...)': [
		loadSrc('await goFetch.call(null, cookies, "/v1/x"); await parent();'),
		LOAD_START
	],
	"an element-access call (m['goFetch'])": [
		loadSrc("await goModule['goFetch'](cookies, '/v1/x'); await parent();"),
		LOAD_START
	],
	'a local helper two levels deep, before parent': [
		loadSrc(
			'await a(cookies); await parent();',
			'async function b(c) { return goFetch(c); }\nasync function a(c) { return b(c); }'
		),
		LOAD_START
	],
	'a re-exported load': [`export { load } from './load-ok-source.ts';`, 'declared in this file']
});

/** Module-level offenders (any server route file that is held to the contract). */
export const MODULE_REFUSED: Offender[] = toList({
	'a call at module level': [
		`${PRELUDE}\nconst warm = goFetch(undefined as never, '/v1/x');\nexport const load = guardAppRoute;`,
		'module level'
	],
	'a top-level await': [
		`${PRELUDE}\nawait goFetch(undefined as never, '/v1/x');\nexport const load = guardAppRoute;`,
		'top-level await'
	],
	'a module-level new': [
		`${PRELUDE}\nclass Reach {}\nconst r = new Reach();\nexport const load = guardAppRoute;`,
		'module level'
	],
	'a module-level tagged template': [
		`${PRELUDE}\nfunction tag(s) { return s; }\nconst t = tag\`x\`;\nexport const load = guardAppRoute;`,
		'module level'
	],
	'a module-level call in a computed class key': [
		`${PRELUDE}\nclass K { [goFetch.name]() {} }\nconst k = (goFetch as any)();\nexport const load = guardAppRoute;`,
		'module level'
	]
});
export const MODULE_OK: Offender[] = toList({
	'only declarations and a guard': `${PRELUDE}\nconst helper = (c) => goFetch(c, '/v1/x');\nexport const load = guardAppRoute;`
});

export const ACTION_OK: Offender[] = toList({
	'formData, the pair, then Go': actionSrc(`${FD} ${AUTH} ${GO}`),
	'a permission from the ACTION table': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, ACTION.roleCreate, () => ({})); if (refused) return refused; ${GO}`
	),
	'a list of P members': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, [P.identityUsersCreate, P.platformUsersManage], () => ({})); if (refused) return refused; ${GO}`
	),
	'a braced if (refused) { return refused; }': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); if (refused) { return refused; } ${GO}`
	),
	'a method property': `${PRELUDE}\nexport const actions = { async a(event) { ${FD} ${AUTH} ${GO} } };`,
	'a function expression': `${PRELUDE}\nexport const actions = { a: async function (event) { ${FD} ${AUTH} ${GO} } };`,
	'the pinned saveTenantSection with a literal section': `${PRELUDE}\nexport const actions = { default: saveTenantSection('profile') };`
});

export const SELF_OK: Offender[] = toList({
	'formData, the self-service pair, then Go': actionSrc(`${FD} ${SELF} ${GO}`)
});

export const ACTION_REFUSED: Offender[] = toList({
	'the result of authoriseAction ignored': [
		actionSrc(`${FD} await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); ${GO}`),
		'authorise'
	],
	'authorisation after the Go call': [actionSrc(`${FD} ${GO} ${AUTH}`), 'authorise'],
	'a Go call before formData and the pair': [actionSrc(`${GO} ${FD} ${AUTH}`), 'authorise'],
	'a conditional authorisation': [actionSrc(`${FD} if (fd) { ${AUTH} } ${GO}`), 'authorise'],
	'an un-awaited authoriseAction (a Promise is always truthy)': [
		actionSrc(
			`${FD} const refused = authoriseAction(event, fd, P.identityUsersCreate, () => ({})); if (refused) return refused; ${GO}`
		),
		'authorise'
	],
	'a refusal that is never returned': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); ${GO}`
		),
		'if (refused) return refused'
	],
	'a Go call between the call and the check': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); ${GO} if (refused) return refused;`
		),
		'if (refused) return refused'
	],
	'a Go call with no authorisation': [actionSrc(GO), 'authorise'],
	'no statements': [actionSrc(''), 'authorise'],
	'a helper outside every server location, before the pair': [
		actionSrc(`${FD} await reach(event.cookies); ${AUTH}`),
		'authorise'
	],
	'a statement between formData and the pair': [
		actionSrc(
			`${FD} const v = fd.get('a'); const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); if (refused) return refused;`
		),
		'authorise'
	],
	'a second formData read': [
		actionSrc(`${FD} const fd2 = await event.request.formData(); ${AUTH}`),
		'authorise'
	],
	'formData of something else': [
		actionSrc(
			`const fd = await other.request.formData(); ${AUTH}`,
			'const other = { request: new Request("http://x") };'
		),
		'authorise'
	],
	'an alias call before the pair': [
		actionSrc(`${FD} await g(event.cookies, '/v1/x'); ${AUTH}`, 'const g = goFetch;'),
		'authorise'
	],
	'goFetch.call before the pair': [
		actionSrc(`${FD} await goFetch.call(null, event.cookies, '/v1/x'); ${AUTH}`),
		'authorise'
	],
	'a permission that is a string literal': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, 'identity.users.create', () => ({})); if (refused) return refused;`
		),
		'P / ACTION'
	],
	'an empty permission': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, '', () => ({})); if (refused) return refused;`
		),
		'P / ACTION'
	],
	'a permission list with a literal in it': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, [P.identityUsersCreate, 'x'], () => ({})); if (refused) return refused;`
		),
		'P / ACTION'
	],
	'a local authoriseAction stub': [
		actionSrc(
			`${FD} ${AUTH} ${GO}`,
			'async function authoriseAction(...a) { return null; }'
		).replace(
			"import { authoriseAction, authoriseSelfService, failForm } from '#lib/server/form-action.ts';",
			'import { authoriseSelfService, failForm } from "#lib/server/form-action.ts";'
		),
		'authorise'
	],
	'a call in the guard arguments': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, await goFetch(event.cookies, '/v1/x')); if (refused) return refused;`
		),
		'no call'
	],
	'a call in the values argument': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, fd.get('a') as never); if (refused) return refused;`
		),
		'no call'
	],
	'(l) the guard result is a let (it can be reassigned)': [
		actionSrc(
			`${FD} let refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({})); refused = null; if (refused) return refused; ${GO}`
		),
		'const'
	],
	'(m) a forged first argument (an object literal)': [
		actionSrc(
			`${FD} const refused = await authoriseAction({ cookies: event.cookies, route: event.route }, fd, P.identityUsersCreate, () => ({})); if (refused) return refused; ${GO}`
		),
		'first argument'
	],
	'(m2) a forged first argument (another object)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(forged, fd, P.identityUsersCreate, () => ({})); if (refused) return refused; ${GO}`,
			'const forged = { cookies: { get: () => "x" }, route: { id: "/(app)/dashboard" } } as never;'
		),
		'first argument'
	],
	'(m3) a spread first argument': [
		actionSrc(
			`${FD} const refused = await authoriseAction(...([event, fd, P.identityUsersCreate, () => ({})] as never)); if (refused) return refused; ${GO}`
		),
		'first argument'
	],
	'(m4) a destructured event with a forged object': [
		actionSrc(
			`const fd = await request.formData(); const refused = await authoriseSelfService({ cookies }, fd, () => ({})); if (refused) return refused; ${GO}`,
			'',
			'{ request, cookies }'
		),
		'first argument'
	],
	'a spread in actions': [
		`${PRELUDE}\nconst other = {};\nexport const actions = { ...other };`,
		'spread'
	],
	'a factory call as an action': [
		`${PRELUDE}\nconst make = (n) => async (event) => null;\nexport const actions = { a: make('x') };`,
		'actions'
	],
	'a factory call as the actions object': [
		`${PRELUDE}\nconst make = () => ({});\nexport const actions = make();`,
		'actions'
	],
	'a shorthand property': [
		`${PRELUDE}\nconst a = async (event) => null;\nexport const actions = { a };`,
		'actions'
	],
	'an identifier as an action': [
		`${PRELUDE}\nconst a = async (event) => null;\nexport const actions = { a: a };`,
		'actions'
	],
	'saveTenantSection with a non-literal section': [
		`${PRELUDE}\nconst s = 'profile';\nexport const actions = { default: saveTenantSection(s as never) };`,
		'actions'
	],
	'saveTenantSection with two arguments': [
		`${PRELUDE}\nexport const actions = { default: (saveTenantSection as any)('profile', {}) };`,
		'actions'
	],
	'a local helper with the pinned name': [
		`${PRELUDE.replace("import { saveTenantSection } from '../settings/tenant/_actions.ts';", '')}\nconst saveTenantSection = (s) => async (event) => null;\nexport const actions = { default: saveTenantSection('profile') };`,
		'actions'
	],
	'a re-export of actions': [
		`export { actions } from './action-ok-source.ts';`,
		'declared in this file'
	],
	'actions that is not an object': [`${PRELUDE}\nexport const actions = null as never;`, 'actions']
});

/** Modules the cases above import (relative to SYNTH_DIR) and the module outside every server location. */
export const SUPPORT_MODULES: Record<string, string> = {
	[join(SYNTH_DIR, 'action-ok-source.ts')]:
		`${PRELUDE}\nexport const actions = { a: async (event) => { ${FD} ${AUTH} } };`,
	[join(SYNTH_DIR, 'load-ok-source.ts')]:
		`${PRELUDE}\nexport const load = async ({ parent }) => { await parent(); };`,
	[NON_SERVER_MODULE]: `import { goFetch } from '#lib/server/go.ts';\nexport async function reach(c) { return goFetch(c, '/v1/x'); }`
};
