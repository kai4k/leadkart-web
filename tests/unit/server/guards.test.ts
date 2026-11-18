import { describe, expect, it } from 'vitest';
import { guardPage, hasRequiredCapability, requireCapability } from '#lib/server/guards.ts';

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

describe('hasRequiredCapability', () => {
	it('answers without redirecting, including for null capabilities', () => {
		expect(hasRequiredCapability(caps(['identity.users.view']), 'identity.users.view')).toBe(true);
		expect(hasRequiredCapability(caps([]), 'identity.users.view')).toBe(false);
		expect(hasRequiredCapability(null, 'identity.users.view')).toBe(false);
	});
	it('platform users hold platform.* implicitly', () => {
		expect(hasRequiredCapability(caps([], { is_platform: true }), 'platform.tenants.view')).toBe(
			true
		);
	});
});

describe('guardPage', () => {
	const parentWith = (c: unknown) =>
		({ parent: () => Promise.resolve({ capabilities: c }) }) as never;

	it('resolves when the parent capabilities hold the permission', async () => {
		await expect(
			guardPage('identity.roles.view')(parentWith(caps(['identity.roles.view'])))
		).resolves.toBeUndefined();
	});
	it('redirects to /dashboard when they do not', async () => {
		await expect(guardPage('identity.roles.view')(parentWith(caps([])))).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
});
