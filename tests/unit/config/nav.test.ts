/**
 * The single nav/permission config: which entries each kind of caller sees, in
 * and out of tenant context. Visibility is a permission check on
 * `effective_permissions` (what Go computed) and nothing else.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	NAV_ROUTES,
	canSee,
	meetsAccess,
	routeForPath,
	visibleNav,
	type NavRoute
} from '#lib/config/nav.ts';
import type { Capabilities } from '#lib/features/auth/capabilities.ts';
import { ACTION, P } from '#lib/features/auth/permissions.ts';
import {
	caps,
	NEW_TENANT_ADMIN,
	OPERATOR_ONE_PERMISSION,
	OWNER,
	persona,
	READ_ONLY_GRANTS,
	SALES_EXECUTIVE,
	SALES_MANAGER,
	SUPER_USER,
	TEAM_LEAD
} from '../../support/go-personas.ts';

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
	// `inContext: null` = the state cannot occur: only a platform operator can act inside a tenant
	// (Go: the scope header is honoured for operators), so no tenant member has that column.
	const table: Array<[string, Capabilities, string[], string[] | null]> = [
		['owner', OWNER, OWN_ALL_TENANT_PAGES, null],
		['new-tenant admin', NEW_TENANT_ADMIN, OWN_ALL_TENANT_PAGES, null],
		[
			'existing-tenant admin with the read bundle',
			persona({ grants: READ_ONLY_GRANTS }),
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
			null
		],
		[
			'sales manager',
			SALES_MANAGER,
			[
				'/dashboard',
				'/settings/users',
				'/settings/roles',
				'/leads',
				'/orders',
				'/inventory',
				'/permission-requests',
				'/settings/account'
			],
			null
		],
		[
			// Go's Team Lead holds the directory views and crm leads, no orders.
			'team lead',
			TEAM_LEAD,
			[
				'/dashboard',
				'/settings/users',
				'/settings/roles',
				'/leads',
				'/permission-requests',
				'/settings/account'
			],
			null
		],
		[
			// Go's Sales Executive holds no inventory permission (the Sales Manager reads inventory).
			'sales executive',
			SALES_EXECUTIVE,
			['/dashboard', '/leads', '/orders', '/permission-requests', '/settings/account'],
			null
		],
		[
			'operator with one platform permission',
			OPERATOR_ONE_PERMISSION,
			// Go adds identity.tenants.view for platform.tenants.view, so the operator's OWN tenant page
			// (the platform tenant) is readable too.
			[
				'/dashboard',
				'/operator/tenants',
				'/settings/tenant',
				'/permission-requests',
				'/settings/account'
			],
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
		if (inContext) expect(hrefs(c, true)).toEqual(inContext);
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

describe('the create-role page and the create action are one rule', () => {
	const operatorRoles = persona({
		isPlatform: true,
		grants: [P.platformTenantsView, P.platformRolesManage]
	});
	it('its entry reads ACTION.roleCreate: nothing is spelled twice', () => {
		const access = NAV_ROUTES.roleNew.access;
		expect(access.kind === 'any' && access.permissions).toEqual([...ACTION.roleCreate]);
	});
	it('an operator with platform.roles.manage may open it inside a tenant context (Go allows POST /roles there)', () => {
		expect(canSee(operatorRoles, NAV_ROUTES.roleNew, true)).toBe(true);
	});
	it('a tenant admin may open it at home, and its own-tenant identity.roles.create does not count inside a context', () => {
		expect(canSee(NEW_TENANT_ADMIN, NAV_ROUTES.roleNew, false)).toBe(true);
		const operatorOwner = persona({
			isPlatform: true,
			roles: ['Company Owner'],
			grants: [P.platformTenantsView]
		});
		expect(canSee(operatorOwner, NAV_ROUTES.roleNew, true)).toBe(false);
	});
});

describe('meetsAccess: the one permission rule behind canSee', () => {
	it('answers without redirecting, for null capabilities too', () => {
		expect(meetsAccess(null, NAV_ROUTES.team)).toBe(false);
		expect(meetsAccess(caps([P.identityUsersView]), NAV_ROUTES.team)).toBe(true);
		expect(meetsAccess(caps([]), NAV_ROUTES.team)).toBe(false);
	});
	it('is_platform / is_super_user alone grant no name; tenant.admin implies nothing on the web', () => {
		expect(meetsAccess(caps([], { is_platform: true }), NAV_ROUTES.tenants)).toBe(false);
		expect(meetsAccess(caps([], { is_super_user: true }), NAV_ROUTES.roleNew)).toBe(false);
		expect(meetsAccess(caps(['tenant.admin']), NAV_ROUTES.team)).toBe(false);
	});
	it('the scope entry is what may enter (or stay in) a tenant context: platform.tenants.view', () => {
		expect(meetsAccess(OPERATOR_ONE_PERMISSION, NAV_ROUTES.scope)).toBe(true);
		expect(meetsAccess(NEW_TENANT_ADMIN, NAV_ROUTES.scope)).toBe(false);
	});
});
