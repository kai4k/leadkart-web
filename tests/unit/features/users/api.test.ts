import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	deactivateUser,
	listAllUsers,
	reactivateUser,
	replacePermissionOverrides
} from '#lib/features/users/api.ts';
import { updateMyProfile } from '#lib/features/auth/api.ts';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = (n: number) => ({
	membership_id: uuid(n),
	person_id: uuid(100 + n),
	tenant_id: uuid(200),
	email: `u${n}@example.com`,
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
			.mockResolvedValueOnce(json({ users: [user(1)], has_more: true, next_cursor: 'n1' }))
			.mockResolvedValueOnce(json({ users: [user(2)], has_more: false }));
		vi.stubGlobal('fetch', fetchMock);
		const all = await listAllUsers();
		expect(all.truncated).toBe(false);
		expect(all.items.map((u) => u.membership_id)).toEqual([uuid(1), uuid(2)]);
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
			message: "You can't make this change to your own account."
		});
	});
});

describe('full-replace bodies (Go answers 400 invalid_body when a field is missing or null)', () => {
	const sent = () => {
		const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json({})));
		vi.stubGlobal('fetch', fetchMock);
		return () => JSON.parse(String(fetchMock.mock.calls[0]![1].body)) as unknown;
	};

	it('PATCH /users/{id}/permission-overrides always carries granted AND revoked, empty arrays included', async () => {
		const body = sent();
		await replacePermissionOverrides('m1', { granted: [], revoked: ['crm.leads.delete'] });
		expect(body()).toEqual({ granted: [], revoked: ['crm.leads.delete'] });
	});

	it('PATCH /users/{id}/profile always carries designation, department and status_message, blank included', async () => {
		const body = sent();
		await updateMyProfile('m1', { designation: '', department: '', status_message: '' });
		expect(body()).toEqual({ designation: '', department: '', status_message: '' });
	});
});
