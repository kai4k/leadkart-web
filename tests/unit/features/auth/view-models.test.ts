import { describe, expect, it } from 'vitest';
import { displayName, userStatus } from '#lib/features/auth/view-models.ts';
import type { UserDto } from '#lib/features/auth/types.ts';

const baseUser: UserDto = {
	membership_id: 'mem_1',
	person_id: 'per_1',
	tenant_id: 'ten_1',
	email: 'ada@example.com',
	first_name: 'Ada',
	last_name: 'Lovelace',
	status: 'active',
	designation: 'Engineer',
	department: 'Platform',
	status_message: '',
	joined_at: '2026-01-01T00:00:00Z',
	role_ids: []
};

describe('displayName', () => {
	it('returns "First Last" when both present', () => {
		expect(displayName(baseUser)).toBe('Ada Lovelace');
	});
	it('falls back to email local-part when both names blank', () => {
		expect(displayName({ ...baseUser, first_name: '', last_name: '' })).toBe('ada');
	});
	it('uses just first name when last is blank', () => {
		expect(displayName({ ...baseUser, last_name: '' })).toBe('Ada');
	});
});

describe('userStatus', () => {
	it('active → success', () => {
		expect(userStatus('active')).toEqual({ label: 'Active', variant: 'success' });
	});
	it('inactive → neutral', () => {
		expect(userStatus('inactive')).toEqual({ label: 'Inactive', variant: 'neutral' });
	});
});
