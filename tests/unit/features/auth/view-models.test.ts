import { describe, expect, it } from 'vitest';
import { displayName, isCurrentSession, userStatus } from '#lib/features/auth/view-models.ts';
import type { UserDto, SessionDto } from '#lib/features/auth/types.ts';

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

describe('isCurrentSession', () => {
	const sess: SessionDto = {
		family_id: 'fam_active',
		tenant_id: 'ten_1',
		device_label: 'Chrome on macOS',
		created_at: '2026-05-10T00:00:00Z',
		last_used_at: '2026-05-18T00:00:00Z'
	};
	it('returns true when family_id matches the active token family', () => {
		expect(isCurrentSession(sess, 'fam_active')).toBe(true);
	});
	it('returns false otherwise', () => {
		expect(isCurrentSession(sess, 'fam_other')).toBe(false);
	});
	it('returns false when no active family known', () => {
		expect(isCurrentSession(sess, null)).toBe(false);
	});
});
