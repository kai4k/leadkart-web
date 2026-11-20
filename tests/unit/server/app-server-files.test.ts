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
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createAnalysis, type Analysis } from '../../support/server-file-guards.ts';
import {
	ACTION_OK,
	ACTION_REFUSED,
	LOAD_OK,
	LOAD_REFUSED,
	MODULE_OK,
	MODULE_REFUSED,
	SELF_OK,
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
	'auth/logout/+server.ts':
		'Sign-out: allowed with or without a live session; it only ends it (CSRF-checked).',
	'auth/confirm-email-change/+server.ts':
		'Confirms an email change from the emailed token: the token is the credential (CSRF-checked).',
	'api/[...path]/+server.ts':
		'The BFF proxy: its own ordered checks (session ended, CSRF, scope fingerprint) run before the call to Go, proven by proxy*.test.ts and proxy-hardening.spec.ts.',
	'api/operator/scope/+server.ts':
		'Enter / exit an operator tenant context: its own ordered checks (session, CSRF, permission), proven by operator-scope-endpoint.test.ts.'
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
const moduleRefused = entries(MODULE_REFUSED, 'module-refused');
const actionOk = entries(ACTION_OK, 'action-ok');
const selfOk = entries(SELF_OK, 'self-ok');
const actionRefused = entries(ACTION_REFUSED, 'action-refused');
const OVERLAY: Record<string, string> = {
	...SUPPORT_MODULES,
	...Object.fromEntries(
		[
			...loadOk,
			...loadRefused,
			...moduleOk,
			...moduleRefused,
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
	an = createAnalysis(HELD, OVERLAY);
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
	it.each(moduleOk.map((c) => [c.name, c.file] as const))('accepts %s', (_n, file) => {
		expect(an.moduleProblems(file)).toEqual([]);
	});

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
