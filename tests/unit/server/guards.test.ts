import { describe, expect, it } from 'vitest';
import { guardPage, hasRequiredCapability, requireCapability } from '#lib/server/guards.ts';

const caps = (permissions: string[], extra = {}) =>
	({
		is_platform: false,
		is_super_user: false,
		permissions: [],
		effective_permissions: permissions,
		...extra
	}) as never;

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
	it('a super-user flag alone passes nothing: only effective_permissions do', () => {
		expect(
			redirectOf(() =>
				requireCapability(caps([], { is_super_user: true }), 'identity.roles.create')
			)
		).toMatchObject({ status: 303, location: '/dashboard' });
		expect(
			redirectOf(() =>
				requireCapability(
					caps(['identity.roles.create'], { is_super_user: true }),
					'identity.roles.create'
				)
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
	it('is_platform alone grants no platform.* name', () => {
		expect(hasRequiredCapability(caps([], { is_platform: true }), 'platform.tenants.view')).toBe(
			false
		);
		expect(
			hasRequiredCapability(
				caps(['platform.tenants.view'], { is_platform: true }),
				'platform.tenants.view'
			)
		).toBe(true);
	});
	it('tenant.admin implies nothing on the web (Go expands it into effective_permissions)', () => {
		expect(hasRequiredCapability(caps(['tenant.admin']), 'identity.users.view')).toBe(false);
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
