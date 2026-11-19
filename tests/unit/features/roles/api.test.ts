import { afterEach, describe, expect, it, vi } from 'vitest';
import { setRoleParent, updateRole } from '#lib/features/roles/api.ts';

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
});
