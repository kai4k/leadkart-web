import { SchemaError } from '#lib/api/errors.ts';
import { getListErrorMessage } from '#lib/api/error-messages.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	activateTenant,
	listTenants,
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

	it('one tenant that breaks the contract fails the whole list with a typed contract error the page can name', async () => {
		const tenant = (id: string, minLength: number) => ({
			id,
			slug: `t-${id}`,
			legal_name: 'Legal Pvt Ltd',
			display_name: 'Legal',
			status: 'active',
			created_at: '2026-01-01T00:00:00Z',
			admin_address: {},
			password_policy: {
				min_length: minLength,
				require_uppercase: true,
				require_lowercase: true,
				require_digit: true,
				require_symbol: true,
				max_failed_attempts: minLength === 0 ? 0 : 5,
				lockout_minutes: 15
			}
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							tenants: [
								tenant('00000000-0000-4000-8000-000000000001', 8),
								tenant('00000000-0000-4000-8000-000000000002', 0)
							]
						}),
						{ status: 200, headers: { 'content-type': 'application/json' } }
					)
				)
			)
		);
		const err = await listTenants().catch((e: unknown) => e);
		expect(err).toBeInstanceOf(SchemaError);
		expect((err as SchemaError).issues.some((i) => i.path.includes('min_length'))).toBe(true);
		// What the list's error surface shows: the server's answer could not be read.
		expect(getListErrorMessage(err, 'tenants')).toMatch(
			/server sent data this page does not understand/i
		);
	});
});
