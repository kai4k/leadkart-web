import { error } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCapabilities = vi.hoisted(() => vi.fn());
const goFetch = vi.hoisted(() => vi.fn());
const setOperatorScope = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/go.ts', () => ({ goFetch }));
vi.mock('#lib/server/csrf.ts', () => ({ assertCsrf: () => null }));
vi.mock('#lib/server/cookies.ts', () => ({
	ACCESS_COOKIE: () => 'lk_access',
	// no refresh cookie in this suite: the session is over exactly when the access cookie is gone
	sessionEnded: (c: { get(n: string): string | undefined }) => !c.get('lk_access')
}));
vi.mock('#lib/server/scope.ts', () => ({
	setOperatorScope,
	clearOperatorScope: vi.fn(),
	readOperatorScope: () => ({ state: 'valid' }),
	scopeFingerprint: () => 'fp-entered'
}));

import { POST } from '../../../src/routes/api/operator/scope/+server.ts';

const TENANT = { id: '00000000-0000-4000-8000-000000000001', slug: 'acme', display_name: 'Acme' };
const PLATFORM = {
	is_platform: true,
	is_super_user: false,
	permissions: [],
	effective_permissions: ['platform.tenants.view']
};
const TENANT_ADMIN = {
	is_platform: false,
	is_super_user: false,
	permissions: ['tenant.admin'],
	effective_permissions: ['tenant.admin', 'identity.users.view']
};

function post(opts: { access?: boolean } = {}) {
	const jar = new Map<string, string>(opts.access === false ? [] : [['lk_access', 'token']]);
	return POST({
		request: new Request('http://x/api/operator/scope', {
			method: 'POST',
			body: JSON.stringify({ slug: 'acme' })
		}),
		cookies: { get: (n: string) => jar.get(n) }
	} as never);
}

/** Kit's `error()` throws the HttpError; capture it to reject a mock with. */
function httpError(status: number, message: string): unknown {
	try {
		error(status, message);
	} catch (e) {
		return e;
	}
}

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as unknown });

beforeEach(() => vi.clearAllMocks());

describe('POST /api/operator/scope', () => {
	it('answers 401 session_expired without an access cookie', async () => {
		expect(await json(await post({ access: false }))).toEqual({
			status: 401,
			body: { error: 'session_expired', message: expect.any(String) }
		});
	});

	it('answers 403 forbidden for a tenant-tier user and never looks the tenant up', async () => {
		loadCapabilities.mockResolvedValue(TENANT_ADMIN);
		expect(await json(await post())).toEqual({
			status: 403,
			body: { error: 'forbidden', message: expect.any(String) }
		});
		expect(goFetch).not.toHaveBeenCalled();
		expect(setOperatorScope).not.toHaveBeenCalled();
	});

	it('answers 401 session_expired when capabilities cannot be read', async () => {
		loadCapabilities.mockResolvedValue(null);
		const res = await json(await post());
		expect(res).toMatchObject({ status: 401, body: { error: 'session_expired' } });
		expect(goFetch).not.toHaveBeenCalled();
	});

	it('relays a capabilities outage as JSON (status kept, never a redirect)', async () => {
		loadCapabilities.mockRejectedValue(httpError(504, 'Go API did not respond in time'));
		expect(await json(await post())).toMatchObject({
			status: 504,
			body: { error: 'upstream_timeout' }
		});
		loadCapabilities.mockRejectedValue(httpError(503, 'Service temporarily unavailable'));
		expect(await json(await post())).toMatchObject({
			status: 503,
			body: { error: 'upstream_unavailable' }
		});
	});

	it('answers 401 session_expired when Go rejects the lookup after refresh', async () => {
		loadCapabilities.mockResolvedValue(PLATFORM);
		goFetch.mockResolvedValue(new Response('{}', { status: 401 }));
		expect(await json(await post())).toMatchObject({
			status: 401,
			body: { error: 'session_expired' }
		});
	});

	it('answers 504 on an upstream timeout, including a body timeout', async () => {
		loadCapabilities.mockResolvedValue(PLATFORM);
		goFetch.mockRejectedValue(
			new TypeError('terminated', { cause: { code: 'UND_ERR_BODY_TIMEOUT' } })
		);
		expect(await json(await post())).toMatchObject({
			status: 504,
			body: { error: 'upstream_timeout' }
		});
	});

	it('refuses an operator who holds other platform permissions but not platform.tenants.view, before any lookup', async () => {
		loadCapabilities.mockResolvedValue({
			...PLATFORM,
			effective_permissions: ['platform.users.view', 'platform.roles.manage']
		});
		expect((await post()).status).toBe(403);
		expect(goFetch).not.toHaveBeenCalled();
		expect(setOperatorScope).not.toHaveBeenCalled();
	});

	it('maps Go refusing the slug lookup (403) to "no access" and sets no scope cookie', async () => {
		loadCapabilities.mockResolvedValue(PLATFORM);
		goFetch.mockResolvedValue(Response.json({ error: 'forbidden' }, { status: 403 }));
		expect(await json(await post())).toMatchObject({
			status: 403,
			body: { error: 'forbidden' }
		});
		expect(setOperatorScope).not.toHaveBeenCalled();
	});

	it('sets the scope for a platform user', async () => {
		loadCapabilities.mockResolvedValue(PLATFORM);
		goFetch.mockResolvedValue(Response.json({ tenants: [TENANT] }));
		const res = await post();
		expect(res.status).toBe(200);
		// the BFF's own answer to the change: the fingerprint the layout will commit
		expect(await res.json()).toEqual({ scope_context: 'fp-entered' });
		expect(setOperatorScope).toHaveBeenCalledWith(expect.anything(), TENANT);
	});
});
