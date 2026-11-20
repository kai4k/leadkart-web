/**
 * THE route / permission config. The sidebar, the page titles, the command
 * palette's "Pages" group, the operator scope tabs, Phase 2's horizontal nav and
 * the server route guards all read this table; there is no second list of
 * routes or of who may see them.
 *
 * Pure module: no icons, no `.svelte` (icons live in `nav-icons.ts`, client only),
 * so server code can import it.
 *
 * Visibility is a permission check and nothing else (see
 * `features/auth/capabilities.ts`): never tier, rank, `is_super_user` or
 * `is_platform`. Two things shape an entry besides its permissions:
 *
 *   context  where it exists. 'own' = the caller's own tenant, 'scope' = while an
 *            operator acts inside another tenant (the BFF sends X-Tenant-Id),
 *            'both' = either. Entries that Go refuses in tenant context
 *            (permission requests) are 'own'; the operator scope tree is 'scope'.
 *   access   any-of permissions (or just "signed in").
 */
import type { ResolvedPathname } from '$app/types';
import { canAny, type Capabilities } from '#lib/features/auth/capabilities.ts';
import { ACTION, P } from '#lib/features/auth/permissions.ts';

type Caps = Capabilities | null | undefined;

type NavContext = 'own' | 'scope' | 'both';
type NavSectionId = 'main' | 'operator' | 'tenantContext' | 'administration' | 'crm' | 'account';
export type AccessRule =
	| { readonly kind: 'authenticated' }
	| { readonly kind: 'any'; readonly permissions: readonly string[] };

export interface NavRoute {
	readonly href: ResolvedPathname;
	readonly label: string;
	readonly section: NavSectionId;
	readonly context: NavContext;
	readonly access: AccessRule;
	/** Guards a sub-tree but is not rendered in navigation. */
	readonly hidden?: true;
}

const AUTHENTICATED: AccessRule = { kind: 'authenticated' };
const anyOf = (...permissions: string[]): AccessRule => ({ kind: 'any', permissions });

export const NAV_ROUTES = {
	dashboard: {
		href: '/dashboard',
		label: 'Dashboard',
		section: 'main',
		context: 'both',
		access: AUTHENTICATED
	},

	// Operator — Go: GET /platform/tenants + /platform/stats need platform.tenants.view,
	// GET /platform/persons* needs platform.users.view.
	tenants: {
		href: '/operator/tenants',
		label: 'Tenants',
		section: 'operator',
		context: 'both',
		access: anyOf(P.platformTenantsView)
	},
	persons: {
		href: '/operator/persons',
		label: 'People',
		section: 'operator',
		context: 'both',
		access: anyOf(P.platformUsersView)
	},

	// The operator scope tree (an operator acting inside a tenant). Go, scoped calls:
	// tenant read + audit = platform.tenants.view|manage; users read = platform.users.view|manage;
	// roles read = platform.roles.view|manage.
	// The tree's own root (a redirect to Profile): guard-only, so every page under /operator/scope resolves.
	scope: {
		href: '/operator/scope',
		label: 'Tenant context',
		section: 'tenantContext',
		context: 'scope',
		access: anyOf(P.platformTenantsView),
		hidden: true
	},
	scopeProfile: {
		href: '/operator/scope/profile',
		label: 'Profile',
		section: 'tenantContext',
		context: 'scope',
		access: anyOf(P.platformTenantsView, P.platformTenantsManage)
	},
	scopeMembers: {
		href: '/operator/scope/members',
		label: 'Members',
		section: 'tenantContext',
		context: 'scope',
		access: anyOf(P.platformUsersView, P.platformUsersManage)
	},
	scopeRoles: {
		href: '/operator/scope/roles',
		label: 'Roles',
		section: 'tenantContext',
		context: 'scope',
		access: anyOf(P.platformRolesView, P.platformRolesManage)
	},
	scopeActivity: {
		href: '/operator/scope/activity',
		label: 'Activity',
		section: 'tenantContext',
		context: 'scope',
		access: anyOf(P.platformTenantsView, P.platformTenantsManage)
	},
	scopeSettings: {
		href: '/operator/scope/settings',
		label: 'Settings',
		section: 'tenantContext',
		context: 'scope',
		access: anyOf(P.platformTenantsView, P.platformTenantsManage)
	},

	// Administration of the caller's own tenant.
	tenantSettings: {
		href: '/settings/tenant',
		label: 'Tenant Settings',
		section: 'administration',
		context: 'own',
		access: anyOf(P.identityTenantsView)
	},
	// Go: POST /roles needs identity.roles.create (or platform.roles.manage for an operator under
	// X-Tenant-Id), stricter than seeing the list: the one list is ACTION.roleCreate. The create form
	// posts through the scope header, so it exists in either context.
	roleNew: {
		href: '/settings/roles/new',
		label: 'New role',
		section: 'administration',
		context: 'both',
		access: anyOf(...ACTION.roleCreate),
		hidden: true
	},
	team: {
		href: '/settings/users',
		label: 'Team',
		section: 'administration',
		context: 'own',
		access: anyOf(P.identityUsersView)
	},
	roles: {
		href: '/settings/roles',
		label: 'Roles',
		section: 'administration',
		context: 'own',
		access: anyOf(P.identityRolesView)
	},

	// CRM. Reads work in tenant context; writes are blocked there (capabilities.ts).
	leads: {
		href: '/leads',
		label: 'Leads',
		section: 'crm',
		context: 'both',
		access: anyOf(P.crmLeadsRead)
	},
	orders: {
		href: '/orders',
		label: 'Orders',
		section: 'crm',
		context: 'both',
		access: anyOf(P.ordersOrdersRead, P.ordersQuotationsRead)
	},
	quotations: {
		href: '/orders/quotations',
		label: 'Quotations',
		section: 'crm',
		context: 'both',
		access: anyOf(P.ordersQuotationsRead),
		hidden: true
	},
	// Go: the landing is the product list (catalogRead = catalog.read|manage). Stock
	// permissions alone reach nothing — batches live under a product.
	inventory: {
		href: '/inventory',
		label: 'Inventory',
		section: 'crm',
		context: 'both',
		access: anyOf(P.inventoryCatalogRead, P.inventoryCatalogManage)
	},

	// Go answers tenant_scope_not_supported on every /permission-requests route in tenant context.
	// Submitting needs identity.meta.request_permission_elevation (gated on the button, ACTION.requestSubmit).
	permissionRequests: {
		href: '/permission-requests',
		label: 'Permission requests',
		section: 'account',
		context: 'own',
		// Go lets any signed-in member list and read requests, and an Administrator-tier member decide
		// them without holding identity.roles.approve: the page is open to everyone, the buttons are not.
		access: AUTHENTICATED
	},
	account: {
		href: '/settings/account',
		label: 'Account',
		section: 'account',
		context: 'both',
		access: AUTHENTICATED
	}
} as const satisfies Record<string, NavRoute>;
export type NavRouteKey = keyof typeof NAV_ROUTES;

const SECTIONS: ReadonlyArray<{ id: NavSectionId; title?: string }> = [
	{ id: 'main' },
	{ id: 'operator', title: 'Operator' },
	{ id: 'tenantContext', title: 'Tenant context' },
	{ id: 'administration', title: 'Administration' },
	{ id: 'crm', title: 'CRM' },
	{ id: 'account', title: 'Account' }
];

/** THE context rule: does this entry exist in the caller's current context? (guards, sidebar and form actions) */
export function contextMatches(route: NavRoute, inTenantContext: boolean): boolean {
	return route.context === 'both' || (route.context === 'scope') === inTenantContext;
}

/**
 * Does the caller hold what the entry's access rule asks, whatever context they are in? The one
 * permission rule behind `canSee`; also what decides "may this caller act in a tenant context" (the
 * `scope` entry: the endpoint that enters one and the layout that drops one the caller can no longer hold).
 */
export function meetsAccess(caps: Caps, route: NavRoute, inTenantContext = false): boolean {
	if (!caps) return false;
	return route.access.kind === 'authenticated'
		? true
		: canAny(caps, route.access.permissions, inTenantContext);
}

export function canSee(caps: Caps, route: NavRoute, inTenantContext = false): boolean {
	return contextMatches(route, inTenantContext) && meetsAccess(caps, route, inTenantContext);
}

interface VisibleNavItem {
	key: NavRouteKey;
	href: ResolvedPathname;
	label: string;
}
export interface VisibleNavSection {
	id: NavSectionId;
	title?: string;
	items: VisibleNavItem[];
}

/** Every entry the caller may see, grouped; empty sections dropped. Hidden (guard-only) entries excluded. */
export function visibleNav(caps: Caps, inTenantContext = false): VisibleNavSection[] {
	const entries = Object.entries(NAV_ROUTES) as Array<[NavRouteKey, NavRoute]>;
	return SECTIONS.map((s) => ({
		id: s.id,
		title: s.title,
		items: entries
			.filter(([, r]) => r.section === s.id && !r.hidden && canSee(caps, r, inTenantContext))
			.map(([key, r]) => ({ key, href: r.href, label: r.label }))
	})).filter((s) => s.items.length > 0);
}

/** The nav route guarding `pathname` (longest href prefix), or null. */
export function routeForPath(pathname: string): NavRoute | null {
	let best: NavRoute | null = null;
	for (const r of Object.values(NAV_ROUTES) as NavRoute[]) {
		if (
			(pathname === r.href || pathname.startsWith(`${r.href}/`)) &&
			(!best || r.href.length > best.href.length)
		)
			best = r;
	}
	return best;
}
