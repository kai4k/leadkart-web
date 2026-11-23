import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	deactivateUser,
	listAllUsers,
	reactivateUser,
	replacePermissionOverrides,
	searchMembers
} from '#lib/features/users/api.ts';

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

	it('listAllUsers asks Go for the status the page shows, and returns the status counts of the first page', async () => {
		const fetchMock = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve(
					json({ users: [], has_more: false, status_counts: { active: 4, inactive: 2 } })
				)
			);
		vi.stubGlobal('fetch', fetchMock);
		const inactive = await listAllUsers('inactive');
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/users?page_size=200&status=inactive');
		expect(inactive.counts).toEqual({ active: 4, inactive: 2 });
		await listAllUsers('all');
		expect(fetchMock.mock.calls[1]![0]).toBe('/api/v1/users?page_size=200&status=all');
	});

	it('the default read sends no status (Go answers active members) and counts are optional', async () => {
		const fetchMock = vi.fn().mockResolvedValue(json({ users: [], has_more: false }));
		vi.stubGlobal('fetch', fetchMock);
		const all = await listAllUsers();
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/users?page_size=200');
		expect(all.counts).toBeUndefined();
	});

	it('searchMembers asks the picker route for 20, with the text trimmed, and reads display_name and designation', async () => {
		const fetchMock = vi.fn().mockImplementation(() =>
			Promise.resolve(
				json({
					members: [{ membership_id: uuid(1), display_name: 'Asha Verma', designation: 'Sales' }]
				})
			)
		);
		vi.stubGlobal('fetch', fetchMock);
		const res = await searchMembers('  asha ');
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/users/search?q=asha&limit=20');
		expect(res.members[0]).toMatchObject({ display_name: 'Asha Verma', designation: 'Sales' });
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
		await replacePermissionOverrides('m1', {
			overrides_version: 'v1',
			granted: [],
			revoked: ['crm.leads.delete']
		});
		expect(body()).toEqual({
			overrides_version: 'v1',
			granted: [],
			revoked: ['crm.leads.delete']
		});
	});
});

describe('memberSearchReady (Go counts characters, 2 to 100)', () => {
	it('counts characters, not UTF-16 units: one emoji is one character', async () => {
		const { memberSearchReady } = await import('#lib/features/users/api.ts');
		expect(memberSearchReady('a')).toBe(false);
		expect(memberSearchReady('\u{1F600}')).toBe(false);
		expect(memberSearchReady('as')).toBe(true);
		expect(memberSearchReady(' a ')).toBe(false);
		expect(memberSearchReady('x'.repeat(100))).toBe(true);
		expect(memberSearchReady('x'.repeat(101))).toBe(false);
		expect(memberSearchReady('\u{1F600}'.repeat(100))).toBe(true);
	});
});
