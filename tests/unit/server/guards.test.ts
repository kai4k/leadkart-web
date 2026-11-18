import { describe, expect, it } from 'vitest';
import { requireCapability } from '#lib/server/guards.ts';

const caps = (permissions: string[], extra = {}) =>
	({ is_platform: false, is_super_user: false, permissions, ...extra }) as never;

function redirectOf(fn: () => void): { status: number; location: string } | null {
	try {
		fn();
		return null;
	} catch (e) {
		return e as { status: number; location: string };
	}
}

describe('requireCapability', () => {
	it('passes when the permission is held', () => {
		expect(
			redirectOf(() => requireCapability(caps(['identity.users.view']), 'identity.users.view'))
		).toBeNull();
	});
	it('passes for a super user', () => {
		expect(
			redirectOf(() =>
				requireCapability(caps([], { is_super_user: true }), 'identity.roles.create')
			)
		).toBeNull();
	});
	it('redirects to /dashboard when the permission is missing', () => {
		expect(redirectOf(() => requireCapability(caps([]), 'identity.users.view'))).toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
	it('redirects when capabilities are missing entirely', () => {
		expect(redirectOf(() => requireCapability(undefined, 'identity.users.view'))).toMatchObject({
			status: 303
		});
	});
});
