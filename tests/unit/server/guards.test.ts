import { describe, expect, it } from 'vitest';
import {
	guardAppRoute,
	hasRequiredCapability,
	pathForRouteId,
	requireRouteAccess
} from '#lib/server/guards.ts';
import { P } from '#lib/features/auth/permissions.ts';
import { caps, OPERATOR_ONE_PERMISSION, OWNER, SUPER_USER } from '../../support/go-personas.ts';

function thrown(fn: () => void): { status: number; location?: string } | null {
	try {
		fn();
		return null;
	} catch (e) {
		return e as { status: number; location?: string };
	}
}

describe('hasRequiredCapability', () => {
	it('answers without redirecting, including for null capabilities', () => {
		expect(hasRequiredCapability(caps([P.identityUsersView]), P.identityUsersView)).toBe(true);
		expect(hasRequiredCapability(caps([]), P.identityUsersView)).toBe(false);
		expect(hasRequiredCapability(null, P.identityUsersView)).toBe(false);
	});
	it('is_platform / is_super_user alone grant no name', () => {
		expect(hasRequiredCapability(caps([], { is_platform: true }), P.platformTenantsView)).toBe(
			false
		);
		expect(hasRequiredCapability(caps([], { is_super_user: true }), P.identityRolesCreate)).toBe(
			false
		);
	});
	it('tenant.admin implies nothing on the web (Go expands it into effective_permissions)', () => {
		expect(hasRequiredCapability(caps(['tenant.admin']), P.identityUsersView)).toBe(false);
	});
});

describe('pathForRouteId', () => {
	it('drops route groups and keeps param segments', () => {
		expect(pathForRouteId('/(app)/settings/users/[id]')).toBe('/settings/users/[id]');
		expect(pathForRouteId('/(app)/dashboard')).toBe('/dashboard');
		expect(pathForRouteId('/(app)/settings/tenant')).toBe('/settings/tenant');
	});
});

describe('requireRouteAccess', () => {
	it('lets a caller who may see the entry through', () => {
		expect(thrown(() => requireRouteAccess(OWNER, '/settings/users/[id]', false))).toBeNull();
	});
	it('redirects to /dashboard when the permission is missing', () => {
		expect(thrown(() => requireRouteAccess(caps([]), '/leads', false))).toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
	it('redirects when capabilities are missing entirely', () => {
		expect(thrown(() => requireRouteAccess(undefined, '/dashboard', false))).toMatchObject({
			status: 303
		});
	});
	it('a detail page resolves to its parent entry', () => {
		const c = caps([P.crmLeadsRead]);
		expect(thrown(() => requireRouteAccess(c, '/leads/[id]', false))).toBeNull();
		expect(thrown(() => requireRouteAccess(caps([]), '/leads/[id]', false))).toMatchObject({
			status: 303
		});
	});
	it('a stricter sub-entry wins (roles/new needs identity.roles.create)', () => {
		const viewer = caps([P.identityRolesView]);
		expect(thrown(() => requireRouteAccess(viewer, '/settings/roles/[id]', false))).toBeNull();
		expect(thrown(() => requireRouteAccess(viewer, '/settings/roles/new', false))).toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
	it('a route the nav does not know is a 404, never open', () => {
		expect(thrown(() => requireRouteAccess(SUPER_USER, '/nowhere', false))).toMatchObject({
			status: 404
		});
	});
	it('an own-tenant page is closed in tenant context, a scope page outside it', () => {
		// into the scoped tenant's own tree, never the own-tenant page over the scoped tenant's data
		expect(thrown(() => requireRouteAccess(OWNER, '/settings/tenant', true))).toMatchObject({
			status: 303,
			location: '/operator/scope/profile'
		});
		expect(
			thrown(() => requireRouteAccess(SUPER_USER, '/operator/scope/members', false))
		).toMatchObject({ status: 303, location: '/operator/tenants' });
	});
	it('a scope page outside the context goes to the dashboard when the tenant list is closed too', () => {
		expect(
			thrown(() =>
				requireRouteAccess(caps([P.platformUsersView]), '/operator/scope/members', false)
			)
		).toMatchObject({ status: 303, location: '/dashboard' });
	});
	it('the operator with one permission reaches only what it holds', () => {
		expect(
			thrown(() => requireRouteAccess(OPERATOR_ONE_PERMISSION, '/operator/tenants', false))
		).toBeNull();
		expect(
			thrown(() => requireRouteAccess(OPERATOR_ONE_PERMISSION, '/operator/persons', false))
		).toMatchObject({ status: 303 });
	});
});

describe('guardAppRoute', () => {
	const event = (id: string | null, c: unknown, inTenantContext = false) =>
		({
			route: { id },
			parent: () => Promise.resolve({ capabilities: c, inTenantContext })
		}) as never;

	it('resolves when the parent capabilities may see the route', async () => {
		await expect(
			guardAppRoute(event('/(app)/settings/roles', caps([P.identityRolesView])))
		).resolves.toBeUndefined();
	});
	it('redirects to /dashboard when they may not', async () => {
		await expect(guardAppRoute(event('/(app)/settings/roles', caps([])))).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
	it('uses the tenant-context flag the (app) layout computed', async () => {
		await expect(guardAppRoute(event('/(app)/settings/tenant', OWNER, true))).rejects.toMatchObject(
			{ status: 303, location: '/operator/scope/profile' }
		);
		await expect(
			guardAppRoute(event('/(app)/operator/scope/members', SUPER_USER, true))
		).resolves.toBeUndefined();
	});
	it('a request without a matched route is a 404', async () => {
		await expect(guardAppRoute(event(null, OWNER))).rejects.toMatchObject({ status: 404 });
	});
});
