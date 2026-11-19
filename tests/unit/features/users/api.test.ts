import { afterEach, describe, expect, it, vi } from 'vitest';
import { deactivateUser, listAllUsers, reactivateUser } from '#lib/features/users/api.ts';

const user = (id: string) => ({
	membership_id: id,
	person_id: `p-${id}`,
	tenant_id: 't1',
	email: `${id}@example.com`,
	first_name: 'A',
	last_name: 'B',
	status: 'active',
	joined_at: '2026-01-01T00:00:00Z',
	role_ids: []
});
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});

afterEach(() => vi.unstubAllGlobals());

describe('users gateway', () => {
	it('listAllUsers follows next_cursor with page_size=200', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(json({ users: [user('a')], has_more: true, next_cursor: 'n1' }))
			.mockResolvedValueOnce(json({ users: [user('b')], has_more: false }));
		vi.stubGlobal('fetch', fetchMock);
		const all = await listAllUsers();
		expect(all.truncated).toBe(false);
		expect(all.items.map((u) => u.membership_id)).toEqual(['a', 'b']);
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/users?page_size=200');
		expect(fetchMock.mock.calls[1]![0]).toBe('/api/v1/users?cursor=n1&page_size=200');
	});

	it('deactivateUser and reactivateUser resolve on 204', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })))
		);
		await expect(deactivateUser('m1', { reason: 'left' })).resolves.toBeUndefined();
		await expect(reactivateUser('m1')).resolves.toBeUndefined();
	});

	it('a 403 from a mutation surfaces code and message, not a schema failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					json(
						{ error: 'self_modification_forbidden', message: 'You cannot deactivate yourself' },
						403
					)
				)
		);
		await expect(deactivateUser('m1', { reason: 'x' })).rejects.toMatchObject({
			status: 403,
			code: 'self_modification_forbidden',
			message: expect.stringContaining('cannot deactivate yourself')
		});
	});
});
