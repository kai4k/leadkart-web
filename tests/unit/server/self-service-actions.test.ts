/**
 * The four self-service account actions (forced password change, profile, password, email) need no
 * permission, but each acts on "the person this page shows". The page can be stale: tab 1 shows X's
 * profile form, tab 2 signs out and in as Y, tab 1 submits. So each checks, with the real scope
 * code, the session first (renewal pending keeps the form, no session signs in) and then the page's
 * context fingerprint, which is bound to the person; nothing reaches Go on a mismatch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actions as mustChangeActions } from '../../../src/routes/(app)/must-change-password/+page.server.ts';
import { actions as profileActions } from '../../../src/routes/(app)/settings/account/profile/+page.server.ts';
import { actions as securityActions } from '../../../src/routes/(app)/settings/account/security/+page.server.ts';
import { scopeFingerprint, setOperatorScope } from '#lib/server/scope.ts';
import { SCOPE_CONTEXT_FIELD } from '#lib/api/scope-header.ts';

const X = 'person-xxxx';
const Y = 'person-yyyy';
const TENANT = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const accessFor = (person: string) =>
	`${seg({ alg: 'none' })}.${seg({ sub: person, tenant_id: 't1', membership_id: 'm1', exp: 4_000_000_000 })}.sig`;

function jar(init: Record<string, string>) {
	const store = new Map(Object.entries(init));
	return {
		store,
		get: (n: string) => store.get(n),
		set: (n: string, v: string) => void store.set(n, v),
		delete: (n: string) => void store.delete(n),
		getAll: () => [],
		serialize: () => ''
	};
}

const signedInAs = (person: string, extra: Record<string, string> = {}) =>
	jar({ lk_access: accessFor(person), lk_csrf: 'c', ...extra });
const fpFor = (person: string) => scopeFingerprint({ state: 'none' }, signedInAs(person) as never);

const form = (fields: Record<string, string>) =>
	new Request('http://x/', { method: 'POST', body: new URLSearchParams(fields) });

const NEW_PW = 'Sh1ny.NewOne.Strong!';

interface Case {
	name: string;
	run: (cookies: unknown, context: string | null) => Promise<unknown>;
}
const withContext = (fields: Record<string, string>, context: string | null) =>
	form(context === null ? fields : { ...fields, [SCOPE_CONTEXT_FIELD]: context });
const call = (fn: unknown, event: object) => (fn as (e: never) => Promise<unknown>)(event as never);

const CASES: Case[] = [
	{
		name: 'must-change-password',
		run: (cookies, context) =>
			call(mustChangeActions.default, {
				request: withContext(
					{ current_password: 'Old.Pass.123!', new_password: NEW_PW, confirm: NEW_PW },
					context
				),
				cookies,
				url: new URL('http://x/must-change-password')
			})
	},
	{
		name: 'profile',
		run: (cookies, context) =>
			call(profileActions.default, {
				request: withContext(
					{ designation: 'Lead', department: 'Ops', status_message: '' },
					context
				),
				cookies
			})
	},
	{
		name: 'security changePassword',
		run: (cookies, context) =>
			call(securityActions.changePassword, {
				request: withContext(
					{ current_password: 'Old.Pass.123!', new_password: NEW_PW, confirm_password: NEW_PW },
					context
				),
				cookies
			})
	},
	{
		name: 'security changeEmail',
		run: (cookies, context) =>
			call(securityActions.changeEmail, {
				request: withContext({ new_email: 'new@example.com' }, context),
				cookies
			})
	}
];

type Fail = { status: number; data: { formErrorKey?: string | null } };
let goCall: ReturnType<typeof vi.fn>;
beforeEach(() => {
	goCall = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
	vi.stubGlobal('fetch', goCall);
});
afterEach(() => vi.unstubAllGlobals());

describe.each(CASES)('$name is bound to the person the page shows', ({ run }) => {
	it('runs with the fingerprint of the page of the same person', async () => {
		// The forced change ends in a redirect (the success path), which is a rejection here.
		const r = (await run(signedInAs(X), fpFor(X)).catch((e: unknown) => e)) as { status?: number };
		expect(r?.status).not.toBe(409);
		expect(goCall).toHaveBeenCalled();
	});

	it('refuses a form that carries no fingerprint (409, nothing reaches Go)', async () => {
		const r = (await run(signedInAs(X), null)) as Fail;
		expect(r.status).toBe(409);
		expect(r.data.formErrorKey).toBe('auth.errors.scopeChanged');
		expect(goCall).not.toHaveBeenCalled();
	});

	it("refuses X's form once the browser holds Y's session (tab 2 signed out and in as Y)", async () => {
		const r = (await run(signedInAs(Y), fpFor(X))) as Fail;
		expect(r.status).toBe(409);
		expect(r.data.formErrorKey).toBe('auth.errors.scopeChanged');
		expect(goCall).not.toHaveBeenCalled();
	});

	it('refuses a form rendered in own context once another tab entered a tenant', async () => {
		const cookies = signedInAs(X);
		setOperatorScope(cookies as never, { id: TENANT, slug: 'acme', display_name: 'Acme' });
		const r = (await run(cookies, fpFor(X))) as Fail;
		expect(r.status).toBe(409);
		expect(goCall).not.toHaveBeenCalled();
	});

	it('a dead scope cookie is reported as scope_invalid (as the proxy does), not as a change', async () => {
		const r = (await run(signedInAs(X, { lk_op_tenant: 'garbage.garbage' }), fpFor(X))) as Fail;
		expect(r.status).toBe(409);
		expect(r.data.formErrorKey).toBe('errors.code.scope_invalid');
		expect(goCall).not.toHaveBeenCalled();
	});

	it('a session being renewed keeps the form (503) before any fingerprint talk', async () => {
		const cookies = jar({ lk_refresh: 'r', lk_csrf: 'c' });
		const r = (await run(cookies, 'stale')) as Fail;
		expect(r.status).toBe(503);
		expect(r.data.formErrorKey).toBe('auth.errors.upstreamUnavailable');
		expect(goCall).not.toHaveBeenCalled();
	});

	it('an ended session goes to sign-in before any fingerprint talk', async () => {
		await expect(run(jar({}), 'stale')).rejects.toMatchObject({ status: 303, location: '/signin' });
		expect(goCall).not.toHaveBeenCalled();
	});
});
