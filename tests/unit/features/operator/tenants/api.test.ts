import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	activateTenant,
	markForDeletion,
	restoreTenant,
	suspendTenant
} from '#lib/features/operator/tenants/api.ts';

afterEach(() => vi.unstubAllGlobals());

describe('operator tenants gateway', () => {
	it('lifecycle mutations resolve void on 204 (tenant_http.go writeTenantMutationResult)', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
		vi.stubGlobal('fetch', fetchMock);
		await expect(suspendTenant('t1', { reason: 'abuse' })).resolves.toBeUndefined();
		await expect(activateTenant('t1')).resolves.toBeUndefined();
		await expect(markForDeletion('t1', { reason: 'churn' })).resolves.toBeUndefined();
		await expect(restoreTenant('t1')).resolves.toBeUndefined();
		expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
			'/api/v1/tenants/t1/suspend',
			'/api/v1/tenants/t1/activate',
			'/api/v1/tenants/t1/mark-for-deletion',
			'/api/v1/tenants/t1/restore'
		]);
	});
});
