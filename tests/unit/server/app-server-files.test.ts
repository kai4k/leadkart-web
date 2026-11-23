/**
 * Every server file under `src/routes` is either HELD to the positional guard contract or pinned as
 * deliberately unguarded with a reason; a new file in neither group fails. The contract (see
 * `tests/support/server-file-guards.ts`): the guard is the first thing a load or an action does and
 * nothing else may run before it; the type checker only proves the guard names resolve to the real
 * declarations. There is no list of "calls that reach Go" to keep up to date.
 *
 * The second half is the walker's self-test: one synthetic offender per way past a guard the
 * reviews found (tests/support/server-file-offenders.ts), each refused for a stated reason, so a
 * walker that stops catching a shape fails here.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
	PINNED_LAYOUT_RESETS,
	contentHash,
	createAnalysis,
	kitModuleFileProblems,
	layoutResetProblems,
	listFiles,
	type Analysis
} from '../../support/server-file-guards.ts';
import {
	ACTION_OK,
	ACTION_REFUSED,
	CALLEE_CASES,
	KIT_FILES_OK,
	KIT_FILES_REFUSED,
	LOAD_OK,
	LOAD_REFUSED,
	MODULE_OK,
	MODULE_OK_MORE,
	MODULE_REFUSED,
	MODULE_REFUSED_MORE,
	PINNED_OK,
	PINNED_REFUSED,
	PLACEMENT_OK,
	PLACEMENT_REFUSED,
	RESET_OK,
	RESET_REFUSED,
	SELF_OK,
	SELF_REFUSED,
	SUPPORT_MODULES,
	SYNTH_DIR,
	type Offender
} from '../../support/server-file-offenders.ts';

const ROUTES_DIR = join(process.cwd(), 'src/routes');

/**
 * Server route files that are deliberately NOT held to the contract, EXACTLY, with the reason. A file
 * is here because the guard it would carry does not apply (no session yet) or is a different one
 * (an endpoint with its own ordered checks, proven by its own tests). Keep this short.
 */
const UNGUARDED: Record<string, string> = {
	'+layout.server.ts':
		'The root layout: serves the CSRF token, preferences and locale to every page, including the signed-out ones; no Go call.',
	'+page.server.ts':
		'The root page: redirects to /dashboard or /signin from the access cookie alone; no Go call.',
	'(app)/+layout.server.ts':
		'The root of the guard chain: it loads the capabilities every section guard reads through parent(), and sends a signed-out user to /signin.',
	'(auth)/signin/+page.server.ts':
		'Sign-in: runs before a session exists; Go enforces credentials.',
	'(auth)/forgot-password/+page.server.ts':
		'Password reset request: before a session; Go answers the same for any address.',
	'(auth)/reset-password/+page.server.ts': 'Password reset with a token: before a session.',
	'(dev)/+layout.server.ts':
		'The developer pages (styleguide, table bench): no session and no data to guard; its one statement answers 404 unless vite dev or the e2e build (NODE_ENV=test), so a production server serves none of them.',
	'auth/logout/+server.ts':
		'Sign-out: allowed with or without a live session; it only ends it (CSRF-checked).',
	'auth/confirm-email-change/+server.ts':
		"Confirms an email change from the emailed token: the token is the credential; it is not CSRF-checked (Kit's origin check covers form content types).",
	'api/[...path]/+server.ts':
		'The BFF proxy: its own ordered checks (session ended, CSRF, scope fingerprint) run before the call to Go, proven by proxy*.test.ts and proxy-hardening.spec.ts.',
	'api/operator/scope/+server.ts':
		'Enter / exit an operator tenant context: its own ordered checks (session, CSRF, permission), proven by operator-scope-endpoint.test.ts.'
};

/**
 * The server functions each UNGUARDED file may reference, EXACTLY (`<file under src/lib/server>#<name>`
 * with the reason it is there). A pinned file is not walked, so without this a later Go call added to
 * an `(auth)` file or an endpoint would go unnoticed: a new reference from `#lib/server/**` fails
 * until it is added here with a reason (and a removed one until it is deleted).
 */
const UNGUARDED_CALLEES: Record<string, Record<string, string>> = {
	'+layout.server.ts': {
		'src/lib/server/cookies.ts#CSRF_COOKIE': 'The cookie name the CSRF token is read from.'
	},
	'+page.server.ts': {
		'src/lib/server/auth-refresh.ts#assertRefreshReachable':
			'Answers 503 instead of a redirect to sign-in when only the refresh outage hides the session.',
		'src/lib/server/cookies.ts#ACCESS_COOKIE': 'Reads the access cookie to decide the redirect.'
	},
	'(app)/+layout.server.ts': {
		'src/lib/server/auth-refresh.ts#assertRefreshReachable':
			'Outage of the refresh endpoint is a 503, not a sign-out.',
		'src/lib/server/capabilities.ts#loadCapabilities':
			'The one capabilities read every guard reads through parent().',
		'src/lib/server/cookies.ts#ACCESS_COOKIE': 'Is there a session at all.',
		'src/lib/server/cookies.ts#mustChangePassword':
			'The forced-change flag the layout redirects on.',
		'src/lib/server/scope.ts#clearOperatorScope':
			'A dead or no-longer-permitted scope cookie is cleared.',
		'src/lib/server/scope.ts#readOperatorScope': 'The operator context the page data carries.',
		'src/lib/server/scope.ts#scopeFingerprint': 'The context fingerprint the page data carries.'
	},
	'(auth)/signin/+page.server.ts': {
		'src/lib/server/proxy.ts#goAuthFetch': 'The login call: the only call this page makes to Go.',
		'src/lib/server/go.ts#readGoError':
			'Reads the code of a refused login (tenant_suspended, tenant_not_active, service_busy).',
		'src/lib/server/form-action.ts#goFailureKey':
			'The key of the busy line when Go sent no Retry-After.',
		'src/lib/server/auth-refresh.ts#establishSession':
			'Sets the session cookies from the login answer.',
		'src/lib/server/auth-refresh.ts#tokenPairSchema': 'Validates the login answer.',
		'src/lib/server/cookies.ts#takeSigninNotice':
			'The load reads the one-word sign-in notice once and deletes it (a name from a fixed list; no Go call).',
		'src/lib/server/auth-errors.ts#validationFieldKeys': 'Maps Go field errors to form keys.',
		'src/lib/server/form-action.ts#callGoForAction': 'Runs the Go call with outage handling.',
		'src/lib/server/form-action.ts#failForm': 'Form failure helper.',
		'src/lib/server/form-action.ts#failFromStatus': 'Form failure helper.',
		'src/lib/server/form-action.ts#failOutage': 'Form failure helper.',
		'src/lib/server/redirect.ts#safeRedirectPath': 'Validates the `next` redirect target.'
	},
	'(auth)/forgot-password/+page.server.ts': {
		'src/lib/server/proxy.ts#goAuthFetch':
			'The reset-request call: the only call this page makes to Go.',
		'src/lib/server/auth-errors.ts#fieldValidationKeys': 'Maps Go field errors to form keys.',
		'src/lib/server/form-action.ts#callGoForAction': 'Runs the Go call with outage handling.',
		'src/lib/server/form-action.ts#failForm': 'Form failure helper.',
		'src/lib/server/form-action.ts#failFromStatus': 'Form failure helper.',
		'src/lib/server/form-action.ts#failOutage': 'Form failure helper.'
	},
	'(auth)/reset-password/+page.server.ts': {
		'src/lib/server/proxy.ts#goAuthFetch':
			'The reset call with the emailed token: the only call this page makes to Go.',
		'src/lib/server/go.ts#readGoError': 'Reads the error body of a refused reset.',
		'src/lib/server/auth-errors.ts#RESET_TOKEN_INVALID': 'The code for a dead token.',
		'src/lib/server/auth-errors.ts#passwordErrorKey': 'Maps a password refusal to a form key.',
		'src/lib/server/form-action.ts#callGoForAction': 'Runs the Go call with outage handling.',
		'src/lib/server/form-action.ts#failForm': 'Form failure helper.',
		'src/lib/server/form-action.ts#failFromStatus': 'Form failure helper.',
		'src/lib/server/form-action.ts#failOutage': 'Form failure helper.'
	},
	// No server function at all: the gate reads Kit's `dev` and NODE_ENV, nothing else.
	'(dev)/+layout.server.ts': {},
	'auth/logout/+server.ts': {
		'src/lib/server/proxy.ts#goAuthFetch':
			'Revokes the refresh token at Go: the only call it makes.',
		'src/lib/server/cookies.ts#REFRESH_COOKIE': 'The refresh token to revoke.',
		'src/lib/server/cookies.ts#clearAuthCookies': 'Ends the session in the browser.',
		'src/lib/server/csrf.ts#assertCsrf': 'CSRF check.',
		'src/lib/server/scope.ts#clearOperatorScope': 'Sign-out ends any operator context.'
	},
	'auth/confirm-email-change/+server.ts': {
		'src/lib/server/proxy.ts#goAuthFetch':
			'Confirms the emailed token at Go: the only call it makes.',
		'src/lib/server/go.ts#goErrorStatus': 'Maps a refused confirmation to a page status.',
		'src/lib/server/http.ts#jsonError': 'JSON error answer.',
		'src/lib/server/http.ts#upstreamJsonError': 'JSON error answer for an outage.'
	},
	'api/[...path]/+server.ts': {
		'src/lib/server/auth-refresh.ts#isAuthExpired':
			'Decides whether a 401 from Go is an expired session.',
		'src/lib/server/auth-refresh.ts#refreshSession': 'The one silent renewal, then one replay.',
		'src/lib/server/client-address.ts#setClientAddress': 'Forwards the client address to Go.',
		'src/lib/server/config.ts#config': 'Upstream base URL and timeouts.',
		'src/lib/server/cookies.ts#ACCESS_COOKIE': 'The Bearer source.',
		'src/lib/server/cookies.ts#sessionEnded': 'Session check before CSRF.',
		'src/lib/server/cookies.ts#sessionRenewalPending':
			'A pending renewal is a 503, not a sign-out.',
		'src/lib/server/csrf.ts#assertCsrf': 'CSRF check.',
		'src/lib/server/http.ts#jsonError': 'JSON error answer.',
		'src/lib/server/http.ts#upstreamJsonError': 'JSON error answer for an outage.',
		'src/lib/server/proxy.ts#buildUpstreamUrl': 'The only way a request path becomes a Go URL.',
		'src/lib/server/proxy.ts#isTokenEndpoint': 'Token endpoints are never proxied.',
		'src/lib/server/proxy.ts#pickResponseHeaders': 'Allowlist of response headers.',
		'src/lib/server/proxy.ts#scrubsTokens': 'Token fields never reach the browser.',
		'src/lib/server/proxy.ts#stripTokenFields': 'Token fields never reach the browser.',
		'src/lib/server/proxy.ts#upstreamStatus': 'Maps an upstream failure to a status.',
		'src/lib/server/proxy.ts#upstreamTimeout': 'Upstream deadline.',
		'src/lib/server/scope-context.ts#pageShowsCurrentContext': 'The context fingerprint check.',
		'src/lib/server/scope.ts#readOperatorScope':
			'The X-Tenant-Id source (the BFF is its only writer).'
	},
	'api/operator/scope/+server.ts': {
		'src/lib/server/go.ts#goFetch':
			'The tenant lookup by slug (scoped:false): the only Go call it makes.',
		'src/lib/server/capabilities.ts#loadCapabilities':
			'The permission check for entering a context.',
		'src/lib/server/cookies.ts#ACCESS_COOKIE': 'Is there a session.',
		'src/lib/server/cookies.ts#sessionEnded': 'Session check before CSRF.',
		'src/lib/server/cookies.ts#sessionRenewalPending':
			'A pending renewal is a 503, not a sign-out.',
		'src/lib/server/csrf.ts#assertCsrf': 'CSRF check.',
		'src/lib/server/http.ts#jsonError': 'JSON error answer.',
		'src/lib/server/http.ts#upstreamJsonError': 'JSON error answer for an outage.',
		'src/lib/server/scope-context.ts#pageShowsCurrentContext':
			'The exit needs the fingerprint of the context shown.',
		'src/lib/server/scope.ts#clearOperatorScope': 'Leaving the context clears the cookie.',
		'src/lib/server/scope.ts#readOperatorScope': 'The context the answer names.',
		'src/lib/server/scope.ts#scopeFingerprint': 'The fingerprint the answer carries.',
		'src/lib/server/scope.ts#setOperatorScope': 'Entering the context writes the signed cookie.'
	}
};

/**
 * The LOCAL modules (outside `src/lib/server`) each UNGUARDED file may import as values, EXACTLY
 * (repo-relative path with the reason). A helper there can call Go without any `#lib/server` reference,
 * so the callee pin above cannot see it: a new local value import fails until it is listed here.
 * Namespace and dynamic imports of `#lib/server/**` are refused outright (see `pinnedFileProblems`).
 */
const UNGUARDED_LOCAL_IMPORTS: Record<string, Record<string, string>> = {
	'(app)/+layout.server.ts': {
		'src/lib/config/nav.ts':
			'The nav table the layout filters by capabilities: pure data and predicates.',
		'src/lib/api/capabilities-refresh.ts':
			'Only the CAPABILITIES_DEPENDENCY constant (the layout depends on it).',
		'src/lib/api/scope-header.ts': 'Only the SCOPE_DEPENDENCY constant and the operator path test.'
	},
	'(auth)/signin/+page.server.ts': {
		'src/lib/api/errors.ts': 'Error code constants and classes: no I/O.',
		'src/lib/features/auth/schemas.ts': 'Zod schemas of the login form and answer: no I/O.'
	},
	'(auth)/forgot-password/+page.server.ts': {
		'src/lib/api/request-schema.ts': 'Zod request schemas: no I/O.'
	},
	'(auth)/reset-password/+page.server.ts': {
		'src/lib/api/request-schema.ts': 'Zod request schemas: no I/O.'
	},
	'auth/confirm-email-change/+server.ts': {
		'src/lib/features/auth/schemas.ts': 'Zod schemas of the confirmation answer: no I/O.'
	},
	'api/[...path]/+server.ts': {
		'src/lib/api/errors.ts': 'Error code constants: no I/O.',
		'src/lib/api/scope-header.ts':
			'The scope-context header and the scope_changed answer constants.'
	},
	'api/operator/scope/+server.ts': {
		'src/lib/api/errors.ts': 'Error code constants: no I/O.',
		'src/lib/api/scope-header.ts': 'The scope_changed answer constants.',
		'src/lib/config/nav.ts': 'The nav table the permission check reads: pure data and predicates.'
	}
};

/**
 * The reviewed content hash of every UNGUARDED file. Two limits of the pins above are inherent: a
 * file pinned to `goFetch` may add a second Go call unnoticed, and the proxy's global `fetch` is not
 * pinned. What covers them is a person reading the file when it changes: any edit to one of these files
 * fails `the reviewed hash` test until the file has been read (every call it makes, every cookie it
 * sets) and the hash below is updated on purpose, in the same commit. Never update it from the failure
 * output alone.
 */
const UNGUARDED_REVIEWED: Record<string, string> = {
	'+layout.server.ts': 'a3aa6cf586cade7fa9c7c830',
	'+page.server.ts': 'd584880de3ad98cfcd66b155',
	'(app)/+layout.server.ts': 'c348bde0597e9584bdde65b1',
	'(auth)/signin/+page.server.ts': 'b7da86af71a08251a5a38ca1',
	'(auth)/forgot-password/+page.server.ts': '234d7157d19409c9ddf6ad3b',
	'(auth)/reset-password/+page.server.ts': '3e7321dc0a8fc0387c411bbd',
	'(dev)/+layout.server.ts': '27bb3985dd4fd968ce81e3f9',
	'auth/logout/+server.ts': 'bcd677fad56c1d16ab658be0',
	'auth/confirm-email-change/+server.ts': '05096bba008b2810c60afd42',
	'api/[...path]/+server.ts': '30cf34a801cdfaf57e1d5564',
	'api/operator/scope/+server.ts': '38bfa0d8e667c367d3ca291d'
};

/**
 * Held files that are under (app) but NOT under a guardAppRoute layout, EXACTLY, with the reason. The
 * location rule (under src/routes/(app)/) has no exception.
 */
const OUTSIDE_GUARD_CHAIN: Record<string, string> = {
	'(app)/must-change-password/+page.server.ts':
		'The forced-change page has no permission and no nav entry (the (app) layout sends the user here); its one action holds authoriseSelfService (session, then the person-bound context fingerprint).'
};

/**
 * Actions exempt from the PERMISSION part of `authoriseAction`, EXACTLY, keyed `<file>#<action>`. Each
 * acts on the caller's own account (the calls pass scoped:false, so a tenant context never changes
 * their target) and needs no permission beyond being signed in; Go enforces the rest. They are NOT
 * exempt from the page binding: each holds the same positional pair with `authoriseSelfService`
 * (session, then the context fingerprint, which is bound to the person).
 */
const SELF_SERVICE_ACTIONS: Record<string, string> = {
	'(app)/must-change-password/+page.server.ts#default':
		"Sets the caller's own password during the forced change.",
	'(app)/settings/account/profile/+page.server.ts#default':
		"Edits the caller's own profile (their membership, scoped:false).",
	'(app)/settings/account/security/+page.server.ts#changePassword':
		"Changes the caller's own password (scoped:false).",
	'(app)/settings/account/security/+page.server.ts#changeEmail':
		"Requests the caller's own email change (scoped:false)."
};

const SERVER_FILE = /(\+(page|layout)\.server\.ts|\+server\.ts)$/;
function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
	);
}
const relRoute = (file: string) => relative(ROUTES_DIR, file).split(sep).join('/');
const ALL = walk(ROUTES_DIR).filter((f) => SERVER_FILE.test(f.split(sep).join('/')));
const HELD = ALL.filter((f) => !(relRoute(f) in UNGUARDED));

/* -------------------------------------------------------------------------------------------- */
/* The synthetic offenders: in-memory files inside the app tree, ONE program with the repository. */
/* -------------------------------------------------------------------------------------------- */

const entries = (list: Offender[], prefix: string) =>
	list.map((o, i) => ({ ...o, file: join(SYNTH_DIR, `${prefix}-${i}.server.ts`) }));
const loadOk = entries(LOAD_OK, 'load-ok');
const loadRefused = entries(LOAD_REFUSED, 'load-refused');
const moduleOk = entries(MODULE_OK, 'module-ok');
const moduleRefused = [
	...entries(MODULE_REFUSED, 'module-refused'),
	...entries(MODULE_REFUSED_MORE, 'module-refused-more')
];
const moduleOkMore = entries(MODULE_OK_MORE, 'module-ok-more');
const selfRefused = entries(SELF_REFUSED, 'self-refused');
const actionOk = entries(ACTION_OK, 'action-ok');
const selfOk = entries(SELF_OK, 'self-ok');
const actionRefused = entries(ACTION_REFUSED, 'action-refused');
const placementFiles = Object.assign(
	{},
	...[...PLACEMENT_REFUSED, ...PLACEMENT_OK].map((c) => c.files)
) as Record<string, string>;
const calleeFiles = CALLEE_CASES.map((c, i) => ({
	...c,
	file: join(SYNTH_DIR, `callee-${i}.server.ts`)
}));
const pinnedCases = [...PINNED_OK, ...PINNED_REFUSED].map((c, i) => ({
	...c,
	file: join(SYNTH_DIR, `pinned-${i}.server.ts`)
}));
const OVERLAY: Record<string, string> = {
	...SUPPORT_MODULES,
	...Object.fromEntries(pinnedCases.map((c) => [c.file, c.src])),
	...placementFiles,
	...Object.fromEntries(calleeFiles.map((c) => [c.file, c.src])),
	...Object.fromEntries(
		[
			...loadOk,
			...loadRefused,
			...moduleOk,
			...moduleOkMore,
			...moduleRefused,
			...selfRefused,
			...actionOk,
			...selfOk,
			...actionRefused
		].map((c) => [c.file, c.src])
	)
};

let an: Analysis;
let buildMs = 0;
beforeAll(() => {
	const start = performance.now();
	// ALL (not only HELD): the pinned files are read for their callees and the layouts for the guard chain.
	an = createAnalysis(ALL, OVERLAY);
	for (const f of HELD) an.loadProblems(f);
	buildMs = performance.now() - start;
}, 120_000);

const actionProblemsOf = (file: string, selfService = false): string[] => {
	const r = an.actionReports(file, () => selfService);
	if (!r) return ['no actions export'];
	return [...r.errors, ...r.reports.flatMap((x) => x.problems.map((p) => `${x.name}: ${p}`))];
};

describe('every server route file is held to the contract or pinned as unguarded', () => {
	it('finds the route files', () => {
		expect(ALL.length).toBeGreaterThan(20);
	});

	it('a file nobody listed is HELD to the contract (the default): it cannot be added unguarded', () => {
		const held = ALL.filter((f) => !(relRoute(f) in UNGUARDED));
		expect(held.length + Object.keys(UNGUARDED).length).toBe(ALL.length);
	});

	it('the unguarded list is exact: real files, each with a reason, none under (app) but its root layout', () => {
		for (const [file, reason] of Object.entries(UNGUARDED)) {
			expect(existsSync(join(ROUTES_DIR, file)), `${file} exists`).toBe(true);
			expect(reason.length, `${file} has a reason`).toBeGreaterThan(20);
			if (file.startsWith('(app)/')) expect(file).toBe('(app)/+layout.server.ts');
		}
	});

	it('analyses the whole repository set in one program, quickly', () => {
		console.info(
			`[server-file walker] one program, ${HELD.length} files: ${Math.round(buildMs)} ms`
		);
		expect(buildMs).toBeLessThan(60_000);
	});
});

describe('unguarded files: the server functions each may reference are pinned', () => {
	it.each(Object.keys(UNGUARDED))('%s', (name) => {
		const pinned = Object.keys(UNGUARDED_CALLEES[name] ?? {}).sort();
		expect(an.serverCallees(join(ROUTES_DIR, name)), name).toEqual(pinned);
	});

	it('every unguarded file has a pin, and every pin has a reason', () => {
		expect(Object.keys(UNGUARDED_CALLEES).sort()).toEqual(Object.keys(UNGUARDED).sort());
		for (const [name, callees] of Object.entries(UNGUARDED_CALLEES)) {
			for (const [callee, reason] of Object.entries(callees)) {
				expect(reason.length, `${name} ${callee}`).toBeGreaterThan(10);
			}
		}
	});
});

describe('unguarded files: what they may import, and the reviewed hash', () => {
	it.each(Object.keys(UNGUARDED))(
		'%s: no namespace / dynamic server import, local imports pinned',
		(name) => {
			const pinned = Object.keys(UNGUARDED_LOCAL_IMPORTS[name] ?? {}).sort();
			expect(an.pinnedFileProblems(join(ROUTES_DIR, name), pinned), name).toEqual([]);
		}
	);

	it('every local import pin has a reason', () => {
		for (const [name, imports] of Object.entries(UNGUARDED_LOCAL_IMPORTS)) {
			expect(Object.keys(UNGUARDED), name).toContain(name);
			for (const [path, reason] of Object.entries(imports)) {
				expect(existsSync(join(process.cwd(), path)), `${name} ${path} exists`).toBe(true);
				expect(reason.length, `${name} ${path}`).toBeGreaterThan(10);
			}
		}
	});

	it('the reviewed hash: any edit to an unguarded file is acknowledged on purpose', () => {
		expect(Object.keys(UNGUARDED_REVIEWED).sort()).toEqual(Object.keys(UNGUARDED).sort());
		for (const [name, reviewed] of Object.entries(UNGUARDED_REVIEWED)) {
			const now = contentHash(readFileSync(join(ROUTES_DIR, name), 'utf8'));
			expect(
				now,
				`${name} changed since it was reviewed. Read it (every Go call, every cookie, every import), then set its hash in UNGUARDED_REVIEWED to ${now}`
			).toBe(reviewed);
		}
	});
});

describe('files Kit routes: .js modules and layout resets cannot hide a server file', () => {
	it('no .js route module or hooks file under src (Kit routes .js too; the walkers read .ts)', () => {
		const files = listFiles(join(process.cwd(), 'src')).map((f) =>
			relative(process.cwd(), f).split(sep).join('/')
		);
		expect(files.length).toBeGreaterThan(100);
		expect(kitModuleFileProblems(files)).toEqual([]);
	});

	it('no Kit layout reset (+page@*.svelte, +layout@*.svelte) under src/routes unless pinned with a reason', () => {
		expect(layoutResetProblems(listFiles(ROUTES_DIR))).toEqual([]);
		for (const [file, reason] of Object.entries(PINNED_LAYOUT_RESETS)) {
			expect(existsSync(join(process.cwd(), file)), file).toBe(true);
			expect(reason.length, file).toBeGreaterThan(20);
		}
	});
});

describe('held files: the guard is the first thing a load or an action does', () => {
	it.each(HELD.map(relRoute))('%s', (name) => {
		const file = join(ROUTES_DIR, name);
		expect(an.loadProblems(file) ?? [], `${name}: load`).toEqual([]);
		const actions = an.actionReports(file, (action) => `${name}#${action}` in SELF_SERVICE_ACTIONS);
		if (actions) {
			expect(actions.errors, `${name}: actions`).toEqual([]);
			expect(actions.reports.length, `${name} has actions`).toBeGreaterThan(0);
			for (const r of actions.reports) expect(r.problems, `${name}#${r.name}`).toEqual([]);
		}
		expect(an.moduleProblems(file), `${name}: module level`).toEqual([]);
		expect(
			an.placementProblems(file, { guardChain: !(name in OUTSIDE_GUARD_CHAIN) }),
			`${name}: placement`
		).toEqual([]);
	});

	it('the guard-chain exceptions are exact: real held files, each with a reason', () => {
		for (const [file, reason] of Object.entries(OUTSIDE_GUARD_CHAIN)) {
			expect(HELD.map(relRoute), file).toContain(file);
			expect(reason.length, file).toBeGreaterThan(20);
			// ... and the file really is outside the chain (a stale exception is a hidden hole)
			expect(an.placementProblems(join(ROUTES_DIR, file)), file).not.toEqual([]);
		}
	});

	it('every held file has a load or actions (a file with neither is dead weight or hides one)', () => {
		for (const f of HELD) {
			expect(an.loadProblems(f) !== null || an.actionReports(f) !== null, relRoute(f)).toBe(true);
		}
	});

	it('the self-service list is exact: real actions, each on authoriseSelfService, none on a permission', () => {
		for (const [key, reason] of Object.entries(SELF_SERVICE_ACTIONS)) {
			const [file, action] = key.split('#') as [string, string];
			expect(reason.length, key).toBeGreaterThan(10);
			const held = an.actionReports(join(ROUTES_DIR, file), (a) => a === action);
			const found = held?.reports.find((x) => x.name === action);
			expect(found, key).toBeDefined();
			expect(found!.problems, key).toEqual([]);
			expect(found!.guard, key).toBe('authoriseSelfService');
		}
		// No other action uses authoriseSelfService.
		for (const f of HELD) {
			const r = an.actionReports(join(f), (a) => `${relRoute(f)}#${a}` in SELF_SERVICE_ACTIONS);
			for (const x of r?.reports ?? []) {
				if (x.guard === 'authoriseSelfService') {
					expect(
						`${relRoute(f)}#${x.name}` in SELF_SERVICE_ACTIONS,
						`${relRoute(f)}#${x.name}`
					).toBe(true);
				}
			}
		}
	});

	it('the pinned action helper is itself held to the action contract', () => {
		expect(an.pinnedHelperProblems()).toEqual([]);
	});
});

/* -------------------------------------------------------------------------------------------- */
/* Self-test: the walker against synthetic offenders, one per bypass. Not the repository.        */
/* -------------------------------------------------------------------------------------------- */

describe('walker self-test: loads', () => {
	it.each(loadOk.map((c) => [c.name, c.file] as const))('accepts %s', (_n, file) => {
		expect(an.loadProblems(file)).toEqual([]);
	});

	it.each(loadRefused.map((c) => [c.name, c.file, c.reason] as const))(
		'refuses %s',
		(_n, file, reason) => {
			const problems = an.loadProblems(file) ?? ['no load export'];
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain(reason);
		}
	);
});

describe('walker self-test: module level', () => {
	it.each([...moduleOk, ...moduleOkMore].map((c) => [c.name, c.file] as const))(
		'accepts %s',
		(_n, file) => {
			expect(an.moduleProblems(file)).toEqual([]);
		}
	);

	it.each(moduleRefused.map((c) => [c.name, c.file, c.reason] as const))(
		'refuses %s',
		(_n, file, reason) => {
			const problems = an.moduleProblems(file);
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain(reason);
		}
	);

	it('the pinned helper call is the one call allowed at module level', () => {
		const pinned = actionOk.find((c) => c.name.includes('pinned saveTenantSection'))!;
		expect(an.moduleProblems(pinned.file)).toEqual([]);
	});
});

describe('walker self-test: placement', () => {
	it.each(PLACEMENT_OK.map((c) => [c.name, Object.keys(c.files)[0]!] as const))(
		'accepts %s',
		(_n, file) => {
			expect(an.placementProblems(file)).toEqual([]);
		}
	);

	it.each(PLACEMENT_REFUSED.map((c) => [c.name, Object.keys(c.files)[0]!, c.reason] as const))(
		'refuses %s',
		(_n, file, reason) => {
			const problems = an.placementProblems(file);
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain(reason);
		}
	);

	it('a guard chain can be waived by a pinned exception, the location never', () => {
		const misplaced = Object.keys(PLACEMENT_REFUSED[0]!.files)[0]!;
		expect(an.placementProblems(misplaced, { guardChain: false })).not.toEqual([]);
		const unguarded = Object.keys(PLACEMENT_REFUSED[3]!.files)[0]!;
		expect(an.placementProblems(unguarded, { guardChain: false })).toEqual([]);
	});
});

describe('walker self-test: the server functions a file references', () => {
	it.each(calleeFiles.map((c) => [c.name, c.file, c.callees] as const))(
		'%s',
		(_n, file, callees) => {
			expect(an.serverCallees(file)).toEqual(callees);
		}
	);
});

describe('walker self-test: pinned files', () => {
	it.each(pinnedCases.filter((c) => !c.reason).map((c) => [c.name, c.file, c.allowed] as const))(
		'accepts %s',
		(_n, file, allowed) => {
			expect(an.pinnedFileProblems(file, allowed)).toEqual([]);
		}
	);

	it.each(
		pinnedCases.filter((c) => c.reason).map((c) => [c.name, c.file, c.allowed, c.reason] as const)
	)('refuses %s', (_n, file, allowed, reason) => {
		const problems = an.pinnedFileProblems(file, allowed);
		expect(problems).not.toEqual([]);
		expect(problems.join(' | ')).toContain(reason);
	});

	it('the content hash ignores line endings and changes with any edit', () => {
		expect(contentHash('a\r\nb\r\n')).toBe(contentHash('a\nb\n'));
		expect(contentHash('a\nb\n')).not.toBe(contentHash('a\nb \n'));
		expect(contentHash('a\nb\n')).toMatch(/^[0-9a-f]{24}$/);
	});
});

describe('walker self-test: Kit files', () => {
	it.each(KIT_FILES_OK)('accepts %s', (path) => {
		expect(kitModuleFileProblems([path])).toEqual([]);
	});

	it.each(KIT_FILES_REFUSED)('refuses %s', (path) => {
		const problems = kitModuleFileProblems([path]);
		expect(problems).not.toEqual([]);
		expect(problems.join(' | ')).toContain('.js');
	});
});

describe('walker self-test: layout resets', () => {
	const local = (files: Record<string, string>) =>
		createAnalysis([], { ...SUPPORT_MODULES, ...files });

	it.each(RESET_REFUSED.map((c) => [c.name, c.files] as const))(
		'refuses %s (the placement check sees it)',
		(_n, files) => {
			const first = Object.keys(files).find((f) => f.endsWith('+page.server.ts'))!;
			const problems = local(files).placementProblems(first);
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain('layout reset');
		}
	);

	it.each(RESET_OK.map((c) => [c.name, c.files] as const))('accepts %s', (_n, files) => {
		const first = Object.keys(files).find((f) => f.endsWith('+page.server.ts'))!;
		expect(local(files).placementProblems(first)).toEqual([]);
	});

	it('a pinned reset (with a reason) is allowed, one without a reason is not', () => {
		const path = join(ROUTES_DIR, '(app)/x/+page@(app).svelte');
		expect(layoutResetProblems([path])).not.toEqual([]);
		expect(layoutResetProblems([path], { '(app)': 'x' })).not.toEqual([]);
		expect(
			layoutResetProblems([path], {
				'src/routes/(app)/x/+page@(app).svelte': 'A print page that needs no shell: reviewed.'
			})
		).toEqual([]);
	});

	it('an ordinary page and layout are not resets', () => {
		expect(
			layoutResetProblems([
				join(ROUTES_DIR, '(app)/+page.svelte'),
				join(ROUTES_DIR, '(app)/+layout.svelte'),
				join(ROUTES_DIR, '(app)/a@b/+page.svelte')
			])
		).toEqual([]);
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

	it.each(selfRefused.map((c) => [c.name, c.file, c.reason] as const))(
		'refuses %s (a pinned self-service action)',
		(_n, file, reason) => {
			const problems = actionProblemsOf(file, true);
			expect(problems).not.toEqual([]);
			expect(problems.join(' | ')).toContain(reason);
		}
	);

	it('checks EACH action: one authorised action does not cover its sibling', () => {
		const src = actionOk[0]!.src.replace(
			'export const actions = { a:',
			'export const actions = { b: async (event) => { await goFetch(event.cookies, "/v1/x"); }, a:'
		);
		const file = join(SYNTH_DIR, 'siblings.server.ts');
		const local = createAnalysis([], { ...OVERLAY, [file]: src });
		const r = local.actionReports(file)!;
		expect(r.reports.find((x) => x.name === 'a')!.problems).toEqual([]);
		expect(r.reports.find((x) => x.name === 'b')!.problems).not.toEqual([]);
	});

	it('a self-service exemption drops the permission, never the page binding', () => {
		for (const c of selfOk) {
			expect(actionProblemsOf(c.file, true)).toEqual([]);
			// the same file is refused when its action is not pinned as self-service
			expect(actionProblemsOf(c.file, false).join(' | ')).toContain('self-service');
		}
		// a pinned self-service action that uses a permission guard is refused too
		expect(actionProblemsOf(actionOk[0]!.file, true).join(' | ')).toContain('self-service');
	});
});
