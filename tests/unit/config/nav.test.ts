/**
 * The single nav/permission config: which entries each kind of caller sees, in
 * and out of tenant context. Visibility is a permission check on
 * `effective_permissions` (what Go computed) and nothing else.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NAV_ROUTES, canSee, routeForPath, visibleNav, type NavRoute } from '#lib/config/nav.ts';
import type { Capabilities } from '#lib/features/auth/capabilities.ts';
import { P } from '#lib/features/auth/permissions.ts';
import {
	caps,
	EXISTING_ADMIN_READ_BUNDLE,
	NEW_TENANT_ADMIN,
	OPERATOR_ONE_PERMISSION,
	OWNER,
	SALES_EXECUTIVE,
	SALES_MANAGER,
	SUPER_USER,
	TEAM_LEAD
} from '../helpers/capability-personas.ts';

const hrefs = (c: Capabilities | null, inTenantContext: boolean) =>
	visibleNav(c, inTenantContext).flatMap((s) => s.items.map((i) => i.href));

const OWN_ALL_TENANT_PAGES = [
	'/dashboard',
	'/settings/tenant',
	'/settings/users',
	'/settings/roles',
	'/leads',
	'/orders',
	'/inventory',
	'/permission-requests',
	'/settings/account'
];

describe('visibleNav: capability set × tenant context → entries', () => {
	const table: Array<[string, Capabilities, string[], string[]]> = [
		['owner', OWNER, OWN_ALL_TENANT_PAGES, ['/dashboard', '/settings/account']],
		[
			'new-tenant admin',
			NEW_TENANT_ADMIN,
			OWN_ALL_TENANT_PAGES,
			['/dashboard', '/settings/account']
		],
		[
			'existing-tenant admin with the read bundle',
			EXISTING_ADMIN_READ_BUNDLE,
			[
				'/dashboard',
				'/settings/tenant',
				'/settings/users',
				'/settings/roles',
				'/leads',
				'/orders',
				'/permission-requests',
				'/settings/account'
			],
			['/dashboard', '/settings/account']
		],
		[
			'sales manager',
			SALES_MANAGER,
			[
				'/dashboard',
				'/settings/users',
				'/leads',
				'/orders',
				'/inventory',
				'/permission-requests',
				'/settings/account'
			],
			['/dashboard', '/settings/account']
		],
		[
			'team lead',
			TEAM_LEAD,
			['/dashboard', '/leads', '/orders', '/permission-requests', '/settings/account'],
			['/dashboard', '/settings/account']
		],
		[
			'sales executive',
			SALES_EXECUTIVE,
			[
				'/dashboard',
				'/leads',
				'/orders',
				'/inventory',
				'/permission-requests',
				'/settings/account'
			],
			['/dashboard', '/settings/account']
		],
		[
			'operator with one platform permission',
			OPERATOR_ONE_PERMISSION,
			['/dashboard', '/operator/tenants', '/permission-requests', '/settings/account'],
			[
				'/dashboard',
				'/operator/tenants',
				'/operator/scope/profile',
				'/operator/scope/activity',
				'/operator/scope/settings',
				'/settings/account'
			]
		],
		[
			'super user',
			SUPER_USER,
			[
				'/dashboard',
				'/operator/tenants',
				'/operator/persons',
				'/settings/tenant',
				'/settings/users',
				'/settings/roles',
				'/leads',
				'/orders',
				'/inventory',
				'/permission-requests',
				'/settings/account'
			],
			[
				'/dashboard',
				'/operator/tenants',
				'/operator/persons',
				'/operator/scope/profile',
				'/operator/scope/members',
				'/operator/scope/roles',
				'/operator/scope/activity',
				'/operator/scope/settings',
				'/leads',
				'/orders',
				'/inventory',
				'/settings/account'
			]
		]
	];

	it.each(table)('%s', (_name, c, own, inContext) => {
		expect(hrefs(c, false)).toEqual(own);
		expect(hrefs(c, true)).toEqual(inContext);
	});

	it('in tenant context a non-super operator loses Leads / Orders / Inventory (Go 403s their reads); a super user keeps them', () => {
		const operator = caps(
			[P.platformTenantsView, P.crmLeadsRead, P.ordersOrdersRead, P.inventoryCatalogRead],
			{ is_platform: true }
		);
		expect(hrefs(operator, false)).toEqual(
			expect.arrayContaining(['/leads', '/orders', '/inventory'])
		);
		expect(hrefs(operator, true)).not.toContain('/leads');
		expect(hrefs(operator, true)).not.toContain('/orders');
		expect(hrefs(operator, true)).not.toContain('/inventory');
		expect(hrefs({ ...operator, is_super_user: true }, true)).toEqual(
			expect.arrayContaining(['/leads', '/orders', '/inventory'])
		);
	});

	it('a caller with no capabilities sees nothing, in either context', () => {
		expect(hrefs(null, false)).toEqual([]);
		expect(hrefs(null, true)).toEqual([]);
	});

	it('a caller with no permissions still sees the always-available entries', () => {
		expect(hrefs(caps([]), false)).toEqual([
			'/dashboard',
			'/permission-requests',
			'/settings/account'
		]);
	});

	it('never decides on tier, rank, is_super_user or is_platform', () => {
		const flags = caps([], {
			tier: 'owner',
			rank: 0,
			is_super_user: true,
			is_platform: true,
			tenant_slug: 'platform',
			permissions: ['tenant.admin']
		});
		expect(hrefs(flags, false)).toEqual([
			'/dashboard',
			'/permission-requests',
			'/settings/account'
		]);
		expect(hrefs(flags, true)).toEqual(['/dashboard', '/settings/account']);
	});

	it('the scope tree is gated per operator permission: members / roles', () => {
		const ctx = (p: string) => hrefs(caps([p]), true);
		expect(ctx(P.platformUsersView)).toContain('/operator/scope/members');
		expect(ctx(P.platformUsersManage)).toContain('/operator/scope/members');
		expect(ctx(P.platformRolesView)).toContain('/operator/scope/roles');
		expect(ctx(P.platformRolesManage)).toContain('/operator/scope/roles');
		expect(ctx(P.platformUsersView)).not.toContain('/operator/scope/roles');
		expect(ctx(P.platformRolesView)).not.toContain('/operator/scope/members');
		expect(ctx(P.platformTenantsManage)).toEqual(
			expect.arrayContaining(['/operator/scope/profile', '/operator/scope/settings'])
		);
	});

	it('/inventory needs catalog permissions: stock permissions alone reach nothing', () => {
		expect(hrefs(caps([P.inventoryStockRead, P.inventoryStockManage]), false)).not.toContain(
			'/inventory'
		);
		expect(hrefs(caps([P.inventoryCatalogManage]), false)).toContain('/inventory');
	});

	it('/orders shows for quotations alone; /permission-requests for either side of the flow', () => {
		expect(hrefs(caps([P.ordersQuotationsRead]), false)).toContain('/orders');
		expect(hrefs(caps([P.identityRolesApprove]), false)).toContain('/permission-requests');
		expect(hrefs(caps([P.identityMetaRequestPermissionElevation]), false)).toContain(
			'/permission-requests'
		);
		expect(hrefs(caps([P.identityUsersView]), false)).toContain('/permission-requests');
		expect(hrefs(caps([P.identityUsersView]), true)).not.toContain('/permission-requests');
	});

	it('hidden (guard-only) entries are never listed', () => {
		const listed = visibleNav(OWNER, false).flatMap((s) => s.items.map((i) => i.key));
		expect(listed).not.toContain('quotations');
	});
});

describe('NAV_ROUTES', () => {
	const routes = Object.entries(NAV_ROUTES) as Array<[string, NavRoute]>;

	it('has one entry per href', () => {
		const all = routes.map(([, r]) => r.href);
		expect(new Set(all).size).toBe(all.length);
	});

	it('every listed entry points at a route that exists', () => {
		for (const [key, r] of routes) {
			if (r.hidden) continue;
			const dir = join(process.cwd(), 'src/routes/(app)', ...r.href.split('/').filter(Boolean));
			const page = ['+page.svelte', '+page.ts', '+layout.svelte', '+page.server.ts'];
			expect(
				page.some((f) => existsSync(join(dir, f))),
				`${key} -> ${r.href}`
			).toBe(true);
		}
	});

	it('canSee agrees with visibleNav', () => {
		for (const ctx of [false, true])
			for (const c of [OWNER, SALES_MANAGER, SUPER_USER, OPERATOR_ONE_PERMISSION]) {
				const listed = new Set(visibleNav(c, ctx).flatMap((s) => s.items.map((i) => i.key)));
				for (const [key, r] of routes) {
					expect(canSee(c, r, ctx) && !r.hidden, `${key} ctx=${ctx}`).toBe(
						listed.has(key as never)
					);
				}
			}
	});
});

describe('routeForPath', () => {
	it('resolves the longest matching prefix', () => {
		expect(routeForPath('/orders/quotations/x')?.href).toBe('/orders/quotations');
		expect(routeForPath('/orders/abc')?.href).toBe('/orders');
		expect(routeForPath('/leads/abc')?.href).toBe('/leads');
		expect(routeForPath('/operator/scope/members')?.href).toBe('/operator/scope/members');
	});
	it('does not match look-alike prefixes or unknown paths', () => {
		expect(routeForPath('/leads-archive')).toBeNull();
		expect(routeForPath('/nowhere')).toBeNull();
	});
});
