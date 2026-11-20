/**
 * The (app) layout tells the page which company an operator is acting in (the banner's text) and
 * nothing else about it: the name is display text, the id and the slug never reach the browser.
 */
import { describe, expect, it, vi } from 'vitest';

const loadCapabilities = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));
const readOperatorScope = vi.hoisted(() => vi.fn(() => ({ state: 'none' }) as { state: string }));
vi.mock('#lib/server/scope.ts', () => ({
	readOperatorScope,
	clearOperatorScope: vi.fn(),
	scopeFingerprint: (r: { state: string }) => (r.state === 'valid' ? 'fp-valid' : r.state)
}));

import { load } from '../../../src/routes/(app)/+layout.server.ts';

const event = () =>
	({
		cookies: {
			get: (n: string) => (n === 'lk_access' ? 'tok' : undefined),
			set: vi.fn(),
			delete: vi.fn()
		},
		url: new URL('http://x/dashboard'),
		route: { id: '/(app)/dashboard' },
		untrack: <T>(fn: () => T): T => fn(),
		locals: {},
		depends: vi.fn()
	}) as never;
const run = () => (load as unknown as (e: never) => Promise<Record<string, unknown>>)(event());
const operator = { person_id: 'p', effective_permissions: ['platform.tenants.view'] };

describe('(app) layout: tenantContext', () => {
	it('names the platform company and marks it as the platform', async () => {
		loadCapabilities.mockResolvedValue(operator);
		readOperatorScope.mockReturnValueOnce({
			state: 'valid',
			scope: { id: 'platform-uuid', slug: 'platform', display_name: 'LeadKart Platform' }
		} as never);
		const data = await run();
		expect(data.tenantContext).toEqual({ displayName: 'LeadKart Platform', isPlatform: true });
	});

	it('a tenant other than the platform is not marked', async () => {
		loadCapabilities.mockResolvedValue(operator);
		readOperatorScope.mockReturnValueOnce({
			state: 'valid',
			scope: { id: 'acme-uuid', slug: 'acme', display_name: 'Acme' }
		} as never);
		expect((await run()).tenantContext).toEqual({ displayName: 'Acme', isPlatform: false });
	});

	it.each([['none'], ['invalid']])('no valid cookie (%s): null', async (state) => {
		loadCapabilities.mockResolvedValue(operator);
		readOperatorScope.mockReturnValueOnce({ state });
		expect((await run()).tenantContext).toBeNull();
	});

	it('the data carries neither the tenant id nor the slug', async () => {
		loadCapabilities.mockResolvedValue(operator);
		readOperatorScope.mockReturnValueOnce({
			state: 'valid',
			scope: { id: 'the-tenant-uuid', slug: 'secret-slug', display_name: 'Acme' }
		} as never);
		const json = JSON.stringify(await run());
		expect(json).not.toContain('the-tenant-uuid');
		expect(json).not.toContain('secret-slug');
	});

	it('a scope the operator may no longer hold is cleared first, so no banner', async () => {
		loadCapabilities.mockResolvedValue({ person_id: 'p', effective_permissions: [] });
		readOperatorScope.mockReturnValueOnce({
			state: 'valid',
			scope: { id: 'u', slug: 'acme', display_name: 'Acme' }
		} as never);
		const data = await run();
		expect(data.inTenantContext).toBe(false);
		expect(data.tenantContext).toBeNull();
	});
});
