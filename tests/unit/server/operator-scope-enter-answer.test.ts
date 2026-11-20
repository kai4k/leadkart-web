/**
 * POST /api/operator/scope answers with the fingerprint of the context the cookie names AFTER this
 * response set it (`{scope_context}`): the tab records it as the value its own layout commit must
 * show. The real `scope.ts` runs here (the sibling suite mocks it): a mutant that computed the answer
 * from the cookie as the REQUEST carried it ("no context" before the change) is caught by comparing
 * the answer with both readings.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCapabilities = vi.hoisted(() => vi.fn());
const goFetch = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
vi.mock('#lib/server/go.ts', () => ({ goFetch }));
vi.mock('#lib/server/csrf.ts', async (importOriginal) => ({
	...(await importOriginal<object>()),
	assertCsrf: () => null
}));

import { POST } from '../../../src/routes/api/operator/scope/+server.ts';
import { readOperatorScope, scopeFingerprint } from '#lib/server/scope.ts';

const PERSON = 'person-aaaa';
const TENANT = { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', slug: 'acme', display_name: 'Acme' };
const PLATFORM = {
	is_platform: true,
	is_super_user: false,
	permissions: [],
	effective_permissions: ['platform.tenants.view']
};

const access = () => {
	const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
	return `${seg({ alg: 'none' })}.${seg({ sub: PERSON, tenant_id: 't1', membership_id: 'm1', exp: 4_000_000_000 })}.sig`;
};

/**
 * Kit's cookie jar: `get` sees what this response set over what the request carried. `received` is
 * kept apart so the test can read the context "as received" as well.
 */
function jar(received: Record<string, string>) {
	const set = new Map<string, string>();
	const view = (includeSet: boolean) =>
		({
			get: (n: string) => (includeSet && set.has(n) ? set.get(n) : received[n]),
			set: (n: string, v: string) => void set.set(n, v),
			delete: (n: string) => void set.delete(n)
		}) as never;
	return { asReceived: view(false), live: view(true) };
}

beforeEach(() => {
	vi.clearAllMocks();
	loadCapabilities.mockResolvedValue(PLATFORM);
	goFetch.mockResolvedValue(Response.json({ tenants: [TENANT] }));
});

describe('POST /api/operator/scope: the answer', () => {
	it('is the fingerprint of the cookie THIS response set, not of the one the request carried', async () => {
		const cookies = jar({ lk_access: access() });
		const res = await POST({
			request: new Request('http://x/api/operator/scope', {
				method: 'POST',
				body: JSON.stringify({ slug: 'acme' })
			}),
			cookies: cookies.live
		} as never);
		expect(res.status).toBe(200);
		const { scope_context } = (await res.json()) as { scope_context: string };

		const before = scopeFingerprint(readOperatorScope(cookies.asReceived), cookies.asReceived);
		const after = scopeFingerprint(readOperatorScope(cookies.live), cookies.live);
		expect(readOperatorScope(cookies.live)).toEqual({ state: 'valid', scope: TENANT });
		expect(before).not.toBe(after); // the two readings differ, so the assertion below can tell them apart
		expect(scope_context).toBe(after);
		expect(scope_context).not.toBe(before);
	});
});
