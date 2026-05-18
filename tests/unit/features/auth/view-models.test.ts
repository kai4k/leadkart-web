import { describe, expect, it } from 'vitest';
import {
	displayName,
	initials,
	lastSeenLabel,
	isCurrentSession
} from '$lib/features/auth/view-models';
import type { UserDto, SessionDto } from '$lib/features/auth/types';

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
	left_at: null,
	reports_to: null,
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

describe('initials', () => {
	it('returns two-letter monogram from first + last', () => {
		expect(initials(baseUser)).toBe('AL');
	});
	it('falls back to email[0] when no name', () => {
		expect(initials({ ...baseUser, first_name: '', last_name: '' })).toBe('A');
	});
});

describe('lastSeenLabel', () => {
	it('returns "just now" for timestamps under a minute', () => {
		const ts = new Date(Date.now() - 30_000).toISOString();
		expect(lastSeenLabel(ts)).toBe('just now');
	});
	it('returns "N minutes ago" for under an hour', () => {
		const ts = new Date(Date.now() - 5 * 60_000).toISOString();
		expect(lastSeenLabel(ts)).toBe('5 minutes ago');
	});
	it('returns "N hours ago" for under a day', () => {
		const ts = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
		expect(lastSeenLabel(ts)).toBe('3 hours ago');
	});
	it('returns absolute date for older timestamps', () => {
		const ts = new Date('2025-12-01T10:00:00Z').toISOString();
		expect(lastSeenLabel(ts)).toMatch(/Dec/);
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
