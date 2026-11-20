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
	'a function declaration with a destructured parent': `${PRELUDE}\nexport async function load({ parent }) { await parent(); await goFetch(); }`
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
	// Fix round 13 (4): ANY second parameter or initialiser, with or without a call. The walker that
	// only looked for calls in the parameters accepted every one of these.
	'(4) a second parameter whose default assigns parent (no call)': [
		loadSrc('await parent();', '', '{ parent, cookies }, _ = (parent = async () => ({}))'),
		'before'
	],
	'(4) a plain second parameter with a default': [
		loadSrc('await parent();', '', '{ parent }, extra = 1'),
		'before'
	],
	'(4) an initialiser on the event that assigns a forged one (no call)': [
		loadSrc('await parent();', 'let g: any;', '{ parent } = (g = { parent: async () => ({}) })'),
		'before'
	],
	'(4) a destructuring default in the event pattern that assigns (no call)': [
		loadSrc('await parent();', 'let x: any;', '{ parent, cookies = (x = 1) }'),
		'before'
	],
	'(4) a computed key in the event pattern': [
		loadSrc('await parent();', 'const k = "cookies";', '{ parent, [k]: c }'),
		'before'
	],
	'(4) a second parameter without a default': [
		loadSrc('await parent();', '', '{ parent }, second'),
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

const GOOD_ACTIONS = `export const actions = { a: async (event) => { ${FD} ${AUTH} ${GO} } };`;
const EVIL = 'async () => { await goFetch(undefined as never, "/v1/x"); }';

/**
 * Module-level offenders, second group: mutation of what the walker read (finding 5: `load`,
 * `actions`, a member of them, or anything the export resolves through must be `const` and never
 * assigned, anywhere in the file) and the module syntax that runs code (finding 15).
 */
export const MODULE_REFUSED_MORE: Offender[] = toList({
	'(5a) export let load, reassigned at module level': [
		`${PRELUDE}\nexport let load = guardAppRoute;\nload = ${EVIL};`,
		'const'
	],
	'(5a2) export let load, never reassigned (it still can be)': [
		`${PRELUDE}\nexport let load = guardAppRoute;`,
		'const'
	],
	'(5b) actions.a reassigned': [`${PRELUDE}\n${GOOD_ACTIONS}\nactions.a = ${EVIL};`, 'assign'],
	'(5b2) actions["a"] reassigned': [
		`${PRELUDE}\n${GOOD_ACTIONS}\nactions['a'] = ${EVIL};`,
		'assign'
	],
	'(5b3) actions.a reassigned with a compound operator': [
		`${PRELUDE}\n${GOOD_ACTIONS}\nactions.a ||= ${EVIL};`,
		'assign'
	],
	'(5c) a let alias of the guard, reassigned': [
		`${PRELUDE}\nlet g = guardAppRoute;\ng = ${EVIL};\nexport const load = g;`,
		'const'
	],
	'(5c2) a let alias of the guard that is only assigned inside a function': [
		`${PRELUDE}\nlet g = guardAppRoute;\nexport function swap() { g = ${EVIL}; }\nexport const load = g;`,
		'const'
	],
	'(5d) destructuring assignment into a member of actions': [
		`${PRELUDE}\n${GOOD_ACTIONS}\n({ x: actions.a } = { x: ${EVIL} });`,
		'assign'
	],
	'(5d2) array destructuring assignment into a member of actions': [
		`${PRELUDE}\n${GOOD_ACTIONS}\n[actions.a] = [${EVIL}];`,
		'assign'
	],
	'(5d3) shorthand destructuring assignment of the alias the load resolves through': [
		`${PRELUDE}\nlet load0 = guardAppRoute;\nexport const load = load0;\n({ load0 } = { load0: ${EVIL} });`,
		'const'
	],
	'(5e) Object.assign(actions, ...) inside a function': [
		`${PRELUDE}\n${GOOD_ACTIONS}\nexport function later() { Object.assign(actions, { a: ${EVIL} }); }`,
		'assign'
	],
	'(5f) Object.defineProperty(actions, ...) inside a function': [
		`${PRELUDE}\n${GOOD_ACTIONS}\nexport function later() { Object.defineProperty(actions, 'a', { value: ${EVIL} }); }`,
		'assign'
	],
	'(5g) delete actions.a': [
		`${PRELUDE}\n${GOOD_ACTIONS}\nexport function later() { delete actions.a; }`,
		'assign'
	],
	'(5h) a function-declaration load reassigned from inside a function': [
		`${PRELUDE}\nexport async function load({ parent }) { await parent(); }\nexport function later() { load = ${EVIL}; }`,
		'assign'
	],
	'(5i) a for-of target that is the alias of the guard': [
		`${PRELUDE}\nlet g = guardAppRoute;\nexport const load = g;\nfor (g of [${EVIL}]) {}`,
		'const'
	],
	'(5j) Reflect.set(actions, ...) inside a function': [
		`${PRELUDE}\n${GOOD_ACTIONS}\nexport function later() { Reflect.set(actions, 'a', ${EVIL}); }`,
		'assign'
	],
	'(15a) a class decorator': [
		`${PRELUDE}\nfunction dec(c) { return c; }\n@dec\nclass K {}\nexport const load = guardAppRoute;`,
		'decorator'
	],
	'(15b) a member decorator': [
		`${PRELUDE}\nfunction dec(a, b) {}\nclass K { @dec m() {} }\nexport const load = guardAppRoute;`,
		'decorator'
	],
	'(15c) a side-effect import of a relative module': [
		`${PRELUDE}\nimport './load-ok-source.ts';\nexport const load = guardAppRoute;`,
		'side-effect import'
	],
	'(15d) a side-effect import through an alias': [
		`${PRELUDE}\nimport '#lib/utils/__synthetic_reach.ts';\nexport const load = guardAppRoute;`,
		'side-effect import'
	]
});

/** Shapes the module rule must keep accepting. */
export const MODULE_OK_MORE: Offender[] = toList({
	'a const alias of the guard': `${PRELUDE}\nconst g = guardAppRoute;\nexport const load = g;`,
	'reading actions members in a function': `${PRELUDE}\n${GOOD_ACTIONS}\nexport function names() { return Object.keys(actions); }`,
	'a local object that merely shares a member name': `${PRELUDE}\n${GOOD_ACTIONS}\nexport function f() { const o = { a: 1 }; o.a = 2; return o; }`,
	'a side-effect import of a bare package': `${PRELUDE}\nimport 'server-only';\nexport const load = guardAppRoute;`
});

export const ACTION_OK: Offender[] = toList({
	'formData, the pair, then Go': actionSrc(`${FD} ${AUTH} ${GO}`),
	'(11) values: an object literal': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, { a: 1 }); if (refused) return refused; ${GO}`
	),
	'(11) values: a function reading the form with get / getAll / String': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: String(fd.get('a') ?? ''), b: fd.getAll('b') })); if (refused) return refused; ${GO}`
	),
	'(11) values: a function with a block body and no calls': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => { return { a: 1 }; }); if (refused) return refused; ${GO}`
	),
	'(5) values: an object literal of literals and form reads': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, { a: fd.get('a'), b: fd.getAll('b'), c: 'x', d: 1, e: true, f: null, g: -1, h: String(fd.get('h') ?? '') }); if (refused) return refused; ${GO}`
	),
	'(5) values: a no-parameter arrow whose block body is one return of such a literal': actionSrc(
		`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => { return { a: fd.get('a') }; }); if (refused) return refused; ${GO}`
	),
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

/** Self-service actions (analysed as pinned self-service) the walker must refuse. */
export const SELF_REFUSED: Offender[] = toList({
	'(11k) the self-service values is a call to a local helper': [
		actionSrc(
			`${FD} const refused = await authoriseSelfService(event, fd, () => readIt(fd)); if (refused) return refused; ${GO}`,
			'const readIt = (f) => ({});'
		),
		'values'
	],
	'(5m) the self-service values spreads an object (a getter runs)': [
		actionSrc(
			`${FD} const refused = await authoriseSelfService(event, fd, () => ({ ...tricky })); if (refused) return refused; ${GO}`,
			'const tricky = { get a() { return 1; } };'
		),
		'values'
	],
	'(11l) the self-service second argument is not the form data': [
		actionSrc(
			`${FD} const refused = await authoriseSelfService(event, other, () => ({})); if (refused) return refused; ${GO}`,
			'const other = {} as never;'
		),
		'second argument'
	]
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
	// finding 4: parameters (and their defaults) run before the body
	'(4) a call in a default parameter of the action': [
		actionSrc(`${FD} ${AUTH} ${GO}`, '', 'event, _ = goFetch(event.cookies, "/v1/x")'),
		'parameters'
	],
	'(4b) a call in a destructuring default of a second parameter': [
		actionSrc(
			`${FD} ${AUTH} ${GO}`,
			'',
			"event, { x = goFetch(undefined as never, '/v1/x') } = {}"
		),
		'parameters'
	],
	'(4c) a call in a default parameter of a method action': [
		`${PRELUDE}\nexport const actions = { async a(event, _ = goFetch(event.cookies, '/v1/x')) { ${FD} ${AUTH} } };`,
		'parameters'
	],
	// Fix round 13 (4): parameters after the event, and initialisers in the event (no call needed).
	'(4d) a second parameter whose default assigns the event (forges the route)': [
		actionSrc(
			`${FD} ${AUTH} ${GO}`,
			'',
			'event, _ = (event = { ...event, route: { id: "/(app)/dashboard" } })'
		),
		'parameters'
	],
	'(4e) a plain second parameter': [
		actionSrc(`${FD} ${AUTH} ${GO}`, '', 'event, extra'),
		'parameters'
	],
	'(4f) an initialiser on the event parameter': [
		actionSrc(`${FD} ${AUTH} ${GO}`, 'const forged: any = {};', 'event = forged'),
		'parameters'
	],
	'(4g) a rest event parameter': [actionSrc(`${FD} ${AUTH} ${GO}`, '', '...event'), 'parameters'],
	// Fix round 13 (5): the values are WHITELISTED in shape. Each of these was accepted by the walker
	// that only looked for call nodes: an implicit call (getter, toString, spread) is not one.
	'(5a) a spread in the values object': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ ...tricky })); if (refused) return refused; ${GO}`,
			'const tricky = { get a() { return 1; } };'
		),
		'values'
	],
	'(5b) a template literal with an expression (toString runs)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: \`\${tricky}\` })); if (refused) return refused; ${GO}`,
			'const tricky = { toString() { return "x"; } };'
		),
		'values'
	],
	'(5c) a property read on another object (a getter runs)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: tricky.a })); if (refused) return refused; ${GO}`,
			'const tricky = { get a() { return 1; } };'
		),
		'values'
	],
	'(5d) a computed key (toString runs)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ [tricky as any]: 1 })); if (refused) return refused; ${GO}`,
			'const tricky = { toString() { return "x"; } };'
		),
		'values'
	],
	'(5e) a shorthand property': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ tricky })); if (refused) return refused; ${GO}`,
			'const tricky = 1;'
		),
		'values'
	],
	'(5f) an arrow function with a parameter': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, (x) => ({ a: 1 })); if (refused) return refused; ${GO}`
		),
		'values'
	],
	'(5g) an arrow function whose parameter default is a getter read': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, (x = tricky.a) => ({})); if (refused) return refused; ${GO}`,
			'const tricky = { get a() { return 1; } };'
		),
		'values'
	],
	'(5h) a form read with a non-literal key (toString runs)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: fd.get(tricky as any) })); if (refused) return refused; ${GO}`,
			'const tricky = { toString() { return "x"; } };'
		),
		'values'
	],
	'(5i) String of a non-form value (toString runs)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: String(tricky) })); if (refused) return refused; ${GO}`,
			'const tricky = { toString() { return "x"; } };'
		),
		'values'
	],
	'(5j) an arrow function with a block body of more than one statement': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => { const a = 1; return { a: 1 }; }); if (refused) return refused; ${GO}`
		),
		'values'
	],
	'(5k) an async arrow function': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, async () => ({ a: 1 })); if (refused) return refused; ${GO}`
		),
		'values'
	],
	'(5l) a nested object in the values': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: { b: 1 } })); if (refused) return refused; ${GO}`
		),
		'values'
	],
	// finding 11: the second argument and the values
	'(11a) the second argument is an object literal, not the form data read before': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, { get: () => '' } as never, P.identityUsersCreate, () => ({})); if (refused) return refused; ${GO}`
		),
		'second argument'
	],
	'(11b) the second argument is another value (declared elsewhere)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, other, P.identityUsersCreate, () => ({})); if (refused) return refused; ${GO}`,
			'const other = {} as never;'
		),
		'second argument'
	],
	'(11c) the second argument is missing': [
		actionSrc(
			`${FD} const refused = await (authoriseAction as any)(event); if (refused) return refused; ${GO}`
		),
		'second argument'
	],
	'(11d) a values function that reaches Go': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => goFetch(event.cookies, '/v1/x') as never); if (refused) return refused; ${GO}`
		),
		'values'
	],
	'(11e) a values function that calls a helper the pin list does not name': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => readIt(fd)); if (refused) return refused; ${GO}`,
			'const readIt = (f) => ({});'
		),
		'values'
	],
	'(11f) a values function that calls get on something else': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: other.get('a') })); if (refused) return refused; ${GO}`,
			'const other = new Map<string, string>();'
		),
		'values'
	],
	'(11g) a values function with a local String that is not the global': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: String(fd.get('a')) })); if (refused) return refused; ${GO}`,
			'const String = (x) => goFetch(undefined as never, "/v1/x");'
		),
		'values'
	],
	'(11h) a values function that awaits': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, async () => ({ a: await fd.get('a') })); if (refused) return refused; ${GO}`
		),
		'values'
	],
	'(11i) values is an identifier (what it holds is not read)': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, v); if (refused) return refused; ${GO}`,
			'const v = () => ({});'
		),
		'values'
	],
	'(11j) a values function that calls a method of the form data that is not get / getAll': [
		actionSrc(
			`${FD} const refused = await authoriseAction(event, fd, P.identityUsersCreate, () => ({ a: [...fd.entries()] })); if (refused) return refused; ${GO}`
		),
		'values'
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

/**
 * Where a held server file sits (finding 2). `files` are all in-memory; the first is the file under
 * test. A held file must live under src/routes/(app)/ and have a REAL guardAppRoute layout load in
 * its own directory or above it (below the (app) root layout), or be the guard layout itself.
 */
export interface PlacementCase {
	name: string;
	/** Absolute path -> source; the first entry is the file under test. */
	files: Record<string, string>;
	reason: string;
}
const ROUTES = join(process.cwd(), 'src/routes');
const GUARD_LAYOUT = `import { guardAppRoute } from '#lib/server/guards.ts';
export const load = guardAppRoute;`;
const GUARDED_LOAD = loadSrc("await parent(); await goFetch(cookies, '/v1/x');");

export const PLACEMENT_REFUSED: PlacementCase[] = [
	{
		name: 'a route in another group that awaits only the root layout',
		files: { [join(ROUTES, '(marketing)/__synthetic__/x/+page.server.ts')]: GUARDED_LOAD },
		reason: 'under src/routes/(app)'
	},
	{
		name: 'a route in another group even beside a guard layout of its own',
		files: {
			[join(ROUTES, '(marketing)/__synthetic__/y/+page.server.ts')]: GUARDED_LOAD,
			[join(ROUTES, '(marketing)/__synthetic__/y/+layout.server.ts')]: GUARD_LAYOUT
		},
		reason: 'under src/routes/(app)'
	},
	{
		name: 'a route at the top of the tree',
		files: { [join(ROUTES, '__synthetic__/+page.server.ts')]: GUARDED_LOAD },
		reason: 'under src/routes/(app)'
	},
	{
		name: 'a route under (app) with no guard layout above it',
		files: { [join(SYNTH_DIR, 'noguard/inner/+page.server.ts')]: GUARDED_LOAD },
		reason: 'guardAppRoute layout'
	},
	{
		name: 'a route whose layout above it only looks like the guard (a local stub)',
		files: {
			[join(SYNTH_DIR, 'stubbed/inner/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'stubbed/+layout.server.ts')]:
				'const guardAppRoute = async () => {}; export const load = guardAppRoute;'
		},
		reason: 'guardAppRoute layout'
	},
	{
		name: 'a route whose layout above it only awaits parent() (not the guard)',
		files: {
			[join(SYNTH_DIR, 'plain/inner/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'plain/+layout.server.ts')]: loadSrc('await parent();')
		},
		reason: 'guardAppRoute layout'
	}
];

export const PLACEMENT_OK: PlacementCase[] = [
	{
		name: 'a page under a guard layout',
		files: {
			[join(SYNTH_DIR, 'guarded/inner/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'guarded/+layout.server.ts')]: GUARD_LAYOUT
		},
		reason: ''
	},
	{
		name: 'a page beside the guard layout in the same directory',
		files: {
			[join(SYNTH_DIR, 'beside/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'beside/+layout.server.ts')]: GUARD_LAYOUT
		},
		reason: ''
	},
	{
		name: 'a page whose guard layout is several directories up',
		files: {
			[join(SYNTH_DIR, 'deep/a/b/c/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'deep/+layout.server.ts')]: GUARD_LAYOUT
		},
		reason: ''
	},
	{
		name: 'the guard layout itself',
		files: { [join(SYNTH_DIR, 'itself/+layout.server.ts')]: GUARD_LAYOUT },
		reason: ''
	}
];

/** Which server functions a file references (finding: pinned files are not walked at all). */
export const CALLEE_CASES: Array<{ name: string; src: string; callees: string[] }> = [
	{
		name: 'a direct call',
		src: `${PRELUDE}
export async function POST({ cookies }) { return goFetch(cookies, '/v1/x'); }`,
		callees: ['src/lib/server/go.ts#goFetch']
	},
	{
		name: 'through a namespace import',
		src: `${PRELUDE}
export async function POST({ cookies }) { return goModule.goFetch(cookies, '/v1/x'); }`,
		callees: ['src/lib/server/go.ts#goFetch']
	},
	{
		name: 'through an alias',
		src: `${PRELUDE}
const g = goFetch;
export async function POST({ cookies }) { return g(cookies, '/v1/x'); }`,
		callees: ['src/lib/server/go.ts#goFetch']
	},
	{
		name: 'passed as a value, never called here',
		src: `${PRELUDE}
export const handlers = [goFetch];`,
		callees: ['src/lib/server/go.ts#goFetch']
	},
	{
		name: 'a second server function',
		src: `${PRELUDE}
export async function POST({ cookies }) { await goFetch(cookies, '/v1/x'); return changePasswordViaGo(cookies, {} as never); }`,
		callees: ['src/lib/server/auth-errors.ts#changePasswordViaGo', 'src/lib/server/go.ts#goFetch']
	},
	{
		name: 'imports that are never used',
		src: `${PRELUDE}
export const x = 1;`,
		callees: []
	},
	{
		name: 'a type-only use of a server module',
		src: `import type { Cookies } from '@sveltejs/kit';
import type { goFetch as G } from '#lib/server/go.ts';
export type T = typeof G;
export const x = (c: Cookies) => c;`,
		callees: []
	}
];

/**
 * Kit layout resets (fix round 13, item 2): `+page@(app).svelte` / `+layout@.svelte` make Kit drop
 * every layout below the `@` target, server loads included, so a section's `guardAppRoute` never runs
 * although the file's directory ancestors still show it. Each case is the files of one route (in
 * memory; `.svelte` files are only listed, never parsed). The placement check must refuse the first
 * file because a reset sits in its directory chain (or anywhere under src/routes).
 */
export interface ResetCase {
	name: string;
	files: Record<string, string>;
}
const resetRoute = (dir: string, svelteName: string): ResetCase['files'] => ({
	[join(dir, '+page.server.ts')]: GUARDED_LOAD,
	[join(dir, '+layout.server.ts')]: GUARD_LAYOUT,
	[join(dir, svelteName)]: ''
});
export const RESET_REFUSED: ResetCase[] = [
	{
		name: 'a page that resets to the (app) layout, beside a guarded server load',
		files: resetRoute(join(SYNTH_DIR, 'print'), '+page@(app).svelte')
	},
	{
		name: 'a page that resets to the root layout',
		files: resetRoute(join(SYNTH_DIR, 'print-root'), '+page@.svelte')
	},
	{
		name: 'a layout that resets to a named layout',
		files: resetRoute(join(SYNTH_DIR, 'print-layout'), '+layout@(app).svelte')
	},
	{
		name: 'a reset in a directory ABOVE the held file',
		files: {
			[join(SYNTH_DIR, 'above/deep/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'above/+layout.server.ts')]: GUARD_LAYOUT,
			[join(SYNTH_DIR, 'above/+layout@.svelte')]: ''
		}
	}
];
export const RESET_OK: ResetCase[] = [
	{
		name: 'a page with an ordinary +page.svelte and +layout.svelte',
		files: {
			[join(SYNTH_DIR, 'plain-ok/+page.server.ts')]: GUARDED_LOAD,
			[join(SYNTH_DIR, 'plain-ok/+layout.server.ts')]: GUARD_LAYOUT,
			[join(SYNTH_DIR, 'plain-ok/+page.svelte')]: '',
			[join(SYNTH_DIR, 'plain-ok/+layout.svelte')]: ''
		}
	}
];

/** Files Kit would route (relative to the repository root): only `.ts` modules are allowed (item 3). */
export const KIT_FILES_OK: string[] = [
	'src/routes/(app)/leads/+page.server.ts',
	'src/routes/(app)/leads/+page.ts',
	'src/routes/api/[...path]/+server.ts',
	'src/hooks.server.ts',
	'src/hooks.client.ts',
	'src/lib/hooks/theme.svelte.ts',
	'src/lib/utils/helper.js.ts',
	'src/service-worker/index.ts'
];
export const KIT_FILES_REFUSED: string[] = [
	'src/routes/(app)/leads/+page.server.js',
	'src/routes/(app)/leads/+layout.server.js',
	'src/routes/api/x/+server.js',
	'src/routes/(app)/leads/+page.js',
	'src/routes/(app)/leads/+layout.js',
	'src/routes/(app)/leads/+page@(app).js',
	'src/hooks.server.js',
	'src/hooks.client.js',
	'src/hooks.js'
];

/**
 * Pinned (unguarded) files (item 6): what a pinned file may import. Each case is ONE pinned file (in
 * memory under SYNTH_DIR) with the local value imports its pin allows (`allowed`, repo-relative).
 */
export interface PinnedCase {
	name: string;
	src: string;
	allowed: string[];
	/** Fragment of the reason (refused cases only). */
	reason: string;
}
const REACH = 'src/lib/utils/__synthetic_reach.ts';
export const PINNED_OK: PinnedCase[] = [
	{
		name: 'a named value import of a server module, and type imports of anything',
		src: `import { goFetch } from '#lib/server/go.ts';\nimport type { Cookies } from '@sveltejs/kit';\nimport type { reach } from '#lib/utils/__synthetic_reach.ts';\nimport { type reach as r2 } from '#lib/utils/__synthetic_reach.ts';\nexport const x = (c: Cookies) => goFetch(c, '/v1/x');`,
		allowed: [],
		reason: ''
	},
	{
		name: 'a local value import that the pin lists',
		src: `import { reach } from '#lib/utils/__synthetic_reach.ts';\nexport const x = reach;`,
		allowed: [REACH],
		reason: ''
	},
	{
		name: 'a package import (a namespace one too) and a Kit virtual module',
		src: `import * as z from 'zod';\nimport { error } from '@sveltejs/kit';\nimport { resolve } from '$app/paths';\nexport const x = [z, error, resolve];`,
		allowed: [],
		reason: ''
	}
];
export const PINNED_REFUSED: PinnedCase[] = [
	{
		name: 'a namespace import of a server module (go["goFetch"] is no direct reference)',
		src: `import * as go from '#lib/server/go.ts';\nexport const x = (c) => go['goFetch'](c, '/v1/x');`,
		allowed: [],
		reason: 'namespace import'
	},
	{
		name: 'a dynamic import of a server module (a computed destructuring key hides the callee)',
		src: `export const x = async (c) => { const { ['goFetch']: f } = await import('#lib/server/go.ts'); return f(c, '/v1/x'); };`,
		allowed: [],
		reason: 'dynamic import'
	},
	{
		name: 'a helper OUTSIDE src/lib/server that reaches Go, not in the pin',
		src: `import { reach } from '#lib/utils/__synthetic_reach.ts';\nexport const x = (c) => reach(c);`,
		allowed: [],
		reason: 'not pinned'
	},
	{
		name: 'a side-effect import of a local module',
		src: `import '#lib/utils/__synthetic_reach.ts';\nexport const x = 1;`,
		allowed: [],
		reason: 'not pinned'
	},
	{
		name: 'a re-export from a local module',
		src: `export { reach } from '#lib/utils/__synthetic_reach.ts';`,
		allowed: [],
		reason: 'not pinned'
	},
	{
		name: 'an export * from a server module',
		src: `export * from '#lib/server/go.ts';`,
		allowed: [],
		reason: 'export *'
	},
	{
		name: 'a dynamic import with a computed specifier',
		src: `export const x = async (s: string) => import(s);`,
		allowed: [],
		reason: 'dynamic import'
	},
	{
		name: 'import x = require(...) of a local module',
		src: `import reach = require('#lib/utils/__synthetic_reach.ts');\nexport const x = reach;`,
		allowed: [],
		reason: 'not pinned'
	},
	{
		name: 'a pin that lists an import the file no longer has',
		src: `export const x = 1;`,
		allowed: [REACH],
		reason: 'no longer imports'
	}
];
