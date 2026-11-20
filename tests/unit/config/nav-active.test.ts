/**
 * `isNavActive`: the one active-entry matcher the sidebar, the horizontal nav and the operator
 * scope tabs share. Exact match or a `${href}/` prefix, never a bare string prefix.
 */
import { describe, expect, it } from 'vitest';
import { isNavActive } from '#lib/config/nav.ts';

describe('isNavActive', () => {
	it('an exact match is active', () => {
		expect(isNavActive('/leads', '/leads')).toBe(true);
	});

	it('a child path is active', () => {
		expect(isNavActive('/leads/1', '/leads')).toBe(true);
		expect(isNavActive('/settings/users/abc/roles', '/settings/users')).toBe(true);
	});

	it('a sibling that merely starts with the same letters is not', () => {
		expect(isNavActive('/leads-archive', '/leads')).toBe(false);
		expect(isNavActive('/settings/users-old', '/settings/users')).toBe(false);
	});

	it('a parent path is not active for its child entry', () => {
		expect(isNavActive('/settings', '/settings/users')).toBe(false);
	});
});
