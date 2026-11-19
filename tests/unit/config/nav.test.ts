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
import { ALL_PERMISSIONS, TENANT_ADMIN_EFFECTIVE } from '../../e2e/helpers/permission-sets.ts';

function caps(effective: readonly string[], overrides: Partial<Capabilities> = {}): Capabilities {
	return {
		person_id: 'per-1',
		membership_id: 'mid-1',
		tenant_id: 'tid-1',
		tenant_slug: 'acme',
		is_platform: false,
		is_super_user: false,
		permissions: [],
		effective_permissions: [...effective],
		roles: [],
		rank: 99,
		tier: 'user',
		...overrides
	};
}
const hrefs = (c: Capabilities | null, inTenantContext: boolean) =>
	visibleNav(c, inTenantContext).flatMap((s) => s.items.map((i) => i.href));

const ALL = ALL_PERMISSIONS;
const TENANT_ADMIN_EFFECTIVE_SET = TENANT_ADMIN_EFFECTIVE;

const OWNER = caps(TENANT_ADMIN_EFFECTIVE_SET, { tier: 'owner', rank: 0 });
const NEW_TENANT_ADMIN = caps(TENANT_ADMIN_EFFECTIVE_SET, {
	tier: 'admin',
	rank: 5
});
const EXISTING_ADMIN_READ_BUNDLE = caps(
	[
		P.identityTenantsView,
		P.identityUsersView,
		P.identityRolesView,
		P.crmLeadsRead,
		P.ordersQuotationsRead
	],
	{ tier: 'admin', rank: 8 }
);
const SALES_MANAGER = caps(
	[
		P.crmLeadsRead,
		P.crmLeadsReadAll,
		P.crmLeadsAssign,
		P.crmLeadsManage,
		P.ordersOrdersRead,
		P.ordersOrdersManage,
		P.ordersQuotationsRead,
		P.ordersQuotationsManage,
		P.inventoryCatalogRead,
		P.identityUsersView,
		P.identityRolesApprove,
		P.identityMetaRequestPermissionElevation,
		P.tasksRead,
		P.tasksReadAll,
		P.notificationsRead
	],
	{ tier: 'manager', rank: 15 }
);
const TEAM_LEAD = caps(
	[
		P.crmLeadsRead,
		P.crmLeadsManage,
		P.ordersOrdersRead,
		P.identityRolesApprove,
		P.identityMetaRequestPermissionElevation
	],
	{ tier: 'team_lead', rank: 25 }
);
const SALES_EXECUTIVE = caps(
	[
		P.crmLeadsRead,
		P.crmLeadsManage,
		P.ordersQuotationsRead,
		P.ordersQuotationsManage,
		P.inventoryCatalogRead,
		P.identityMetaRequestPermissionElevation
	],
	{ tier: 'user', rank: 40 }
);
const OPERATOR_ONE_PERMISSION = caps([P.platformTenantsView], {
	is_platform: true,
	tenant_slug: 'platform'
});
const SUPER_USER = caps(ALL, { is_platform: true, is_super_user: true, tenant_slug: 'platform' });

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
		[
			'owner',
			OWNER,
			OWN_ALL_TENANT_PAGES,
			['/dashboard', '/leads', '/orders', '/inventory', '/settings/account']
		],
		[
			'new-tenant admin',
			NEW_TENANT_ADMIN,
			OWN_ALL_TENANT_PAGES,
			['/dashboard', '/leads', '/orders', '/inventory', '/settings/account']
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
				'/settings/account'
			],
			['/dashboard', '/leads', '/orders', '/settings/account']
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
			['/dashboard', '/leads', '/orders', '/inventory', '/settings/account']
		],
		[
			'team lead',
			TEAM_LEAD,
			['/dashboard', '/leads', '/orders', '/permission-requests', '/settings/account'],
			['/dashboard', '/leads', '/orders', '/settings/account']
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
			['/dashboard', '/leads', '/orders', '/inventory', '/settings/account']
		],
		[
			'operator with one platform permission',
			OPERATOR_ONE_PERMISSION,
			['/dashboard', '/operator/tenants', '/settings/account'],
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

	it('a caller with no capabilities sees nothing, in either context', () => {
		expect(hrefs(null, false)).toEqual([]);
		expect(hrefs(null, true)).toEqual([]);
	});

	it('a caller with no permissions still sees the always-available entries', () => {
		expect(hrefs(caps([]), false)).toEqual(['/dashboard', '/settings/account']);
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
		expect(hrefs(flags, false)).toEqual(['/dashboard', '/settings/account']);
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
		expect(hrefs(caps([P.identityUsersView]), false)).not.toContain('/permission-requests');
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
