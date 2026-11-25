/**
 * `session.inCompanyScope`: acting inside a COMPANY. LeadKart's own tenant opened in operator scope is a tenant
 * context but not a company (the layout sends `tenantContext.isPlatform`).
 */
import { describe, expect, it, vi } from 'vitest';

const pageData = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('$app/state', () => ({ page: pageData }));
vi.mock('#lib/features/auth/api.ts', () => ({ logout: vi.fn() }));
vi.mock('#lib/api/operator-scope.ts', () => ({ announceContextChange: vi.fn() }));
vi.mock('#lib/api/query-client.ts', () => ({ clearUserBrowserState: vi.fn() }));

import { session } from '#lib/features/auth/stores/session.svelte.ts';

describe('session.inCompanyScope', () => {
	it('is false outside a tenant context', () => {
		pageData.data = { inTenantContext: false, tenantContext: null };
		expect(session.inCompanyScope).toBe(false);
	});

	it('is true in a company scope', () => {
		pageData.data = {
			inTenantContext: true,
			tenantContext: { displayName: 'Acme', isPlatform: false }
		};
		expect(session.inCompanyScope).toBe(true);
	});

	it('is false in LeadKart own tenant opened in operator scope', () => {
		pageData.data = {
			inTenantContext: true,
			tenantContext: { displayName: 'LeadKart', isPlatform: true }
		};
		expect(session.inTenantContext).toBe(true);
		expect(session.inCompanyScope).toBe(false);
	});
});
