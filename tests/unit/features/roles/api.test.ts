import { afterEach, describe, expect, it, vi } from 'vitest';
import { deactivateRole, setRoleParent, updateRole } from '#lib/features/roles/api.ts';

afterEach(() => vi.unstubAllGlobals());

describe('roles gateway', () => {
	it('updateRole and setRoleParent resolve on 204', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
		vi.stubGlobal('fetch', fetchMock);
		await expect(updateRole('r1', { name: 'Sales' })).resolves.toBeUndefined();
		await expect(setRoleParent('r1', { parent_role_id: null })).resolves.toBeUndefined();
		expect(fetchMock.mock.calls[1]![0]).toBe('/api/v1/roles/r1/parent');
	});

	describe('deactivateRole ("Delete" on screen)', () => {
		const role = {
			id: '00000000-0000-4000-8000-00000000010b',
			tenant_id: '00000000-0000-4000-8000-000000000001',
			name: 'Sales Lead',
			hierarchy_level: 5,
			permissions: ['crm.leads.view'],
			is_active: false,
			is_system_default: false,
			is_super_admin: false,
			created_at: '2026-01-01T00:00:00Z'
		};
		const answer = (body: unknown, status = 200) =>
			vi.fn().mockImplementation(() =>
				Promise.resolve(
					new Response(JSON.stringify(body), {
						status,
						headers: { 'content-type': 'application/json' }
					})
				)
			);

		it('POSTs /v1/roles/{id}/deactivate and returns the updated role', async () => {
			const fetchMock = answer(role);
			vi.stubGlobal('fetch', fetchMock);
			await expect(deactivateRole('r1')).resolves.toMatchObject({ id: role.id, is_active: false });
			const [url, init] = fetchMock.mock.calls[0]!;
			expect(url).toBe('/api/v1/roles/r1/deactivate');
			expect(init.method).toBe('POST');
			expect(JSON.parse(init.body)).toEqual({});
		});

		it('encodes the id as one path segment', async () => {
			const fetchMock = answer(role);
			vi.stubGlobal('fetch', fetchMock);
			await deactivateRole('a/b');
			expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/roles/a%2Fb/deactivate');
		});

		it('refuses a body that is not a role (the response is parsed against the schema)', async () => {
			vi.stubGlobal('fetch', answer({ ok: true }));
			await expect(deactivateRole('r1')).rejects.toThrow();
		});
	});
});
