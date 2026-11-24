/**
 * The ONE persona builder for unit and e2e tests: it projects a caller the way leadkart-go does,
 * so a test never hand-writes `effective_permissions`.
 *
 * Go's rules (leadkart-go, read-only reference; `tests/unit/support/go-personas-pinned.test.ts` pins
 * the tables below to Go's own files at the commit in SOURCE.json):
 *   - `internal/identity/ports/authn/authorize.go` `satisfiesIn` + `EffectivePermissions`: for every
 *     name in the catalogue, in the caller's OWN tenant
 *       1. a super user satisfies everything;
 *       2. a held name satisfies itself, except a platform-reserved one (other than `tenant.admin`),
 *          which only counts for a platform operator;
 *       3. `tenant.admin` implies every known, non-platform-reserved name;
 *       4. a platform operator's `platform.*` grant satisfies the `identity.*` names it is the
 *          equivalent of.
 *   - `internal/identity/domain/permission/implication.go`: `platformReserved` and
 *     `platformEquivalents` (copied below).
 *   - `internal/identity/ports/me_http.go`: `permissions` is what the JWT holds, `effective_permissions`
 *     is the list above; `rank` / `tier` come from the caller's best (lowest) role level.
 *   - `internal/identity/app/seed/role_catalog.go` `DefaultRoleCatalog`: the seeded roles' grants
 *     (copied below, bundle by bundle, so a role's persona is its real grant set).
 *
 * `tests/unit/features/auth/permissions.test.ts` already pins the catalogue to Go's file; the
 * rules here are exercised by `tests/unit/support/go-personas.test.ts`.
 */
import type { Capabilities } from '../../src/lib/features/auth/capabilities.ts';
import { P } from '../../src/lib/features/auth/permissions.ts';
import {
	PERMISSION_CATALOGUE,
	PLATFORM_MANAGED_ROLE
} from '../../src/lib/features/roles/permissions-catalogue.ts';

/** Go `IsPlatformManagedRole`: the web's one copy lives in the catalogue (the pinned test holds it to Go). */
export { PLATFORM_MANAGED_ROLE };

const TENANT_ADMIN = 'tenant.admin';

/** Go `platformReserved`: `tenant.admin` never implies these (and `tenant.admin` itself is only satisfied by holding it). */
export const PLATFORM_RESERVED: ReadonlySet<string> = new Set([
	TENANT_ADMIN,
	P.platformTenantsView,
	P.platformTenantsCreate,
	P.platformTenantsManage,
	P.platformUsersView,
	P.platformUsersCreate,
	P.platformUsersManage,
	P.platformRolesView,
	P.platformRolesManage,
	P.platformImpersonationManage,
	P.platformTenantsOwnership,
	'platform.unverified_contacts.manage',
	'platform.lead_credits.topup',
	P.identityTenantsSuspend,
	P.identityTenantsActivate
]);

/** Go `platformEquivalents`: an operator holding any of the right-hand names satisfies the left-hand one. */
export const PLATFORM_EQUIVALENTS: Readonly<Record<string, readonly string[]>> = {
	[P.identityTenantsView]: [P.platformTenantsView, P.platformTenantsManage],
	[P.identityTenantsUpdate]: [P.platformTenantsManage],
	[P.identityTenantsUpdateSettings]: [P.platformTenantsManage],
	[P.identityUsersView]: [P.platformUsersView, P.platformUsersManage],
	[P.identityUsersCreate]: [P.platformUsersCreate, P.platformUsersManage],
	[P.identityRolesView]: [P.platformRolesView, P.platformRolesManage],
	...Object.fromEntries(
		[
			P.identityUsersUpdate,
			P.identityUsersDeactivate,
			P.identityUsersReactivate,
			P.identityUsersUnlock,
			P.identityUsersUpdatePermissions
		].map((n) => [n, [P.platformUsersManage]])
	),
	...Object.fromEntries(
		[
			P.identityRolesCreate,
			P.identityRolesUpdate,
			P.identityRolesManage,
			P.identityRolesAssign,
			P.identityRolesRevoke
		].map((n) => [n, [P.platformRolesManage]])
	)
};

/** Every name in Go's catalogue: a super user's effective permissions. */
export const ALL_PERMISSIONS: readonly string[] = PERMISSION_CATALOGUE.map((e) => e.name);

export interface Claims {
	/** What the JWT holds (the union of the caller's role grants and overrides). */
	permissions: readonly string[];
	isSuperUser?: boolean;
	/** Slug-anchored to the platform tenant. */
	isPlatform?: boolean;
	/** An impersonation session (Go `Claims.Act != nil`): a platform operator acting inside a company. It is not a platform operator itself, and it satisfies the role-management names through the company's own grants. */
	isImpersonation?: boolean;
}

/**
 * Go `satisfiesIn` for the caller's own tenant, with `superUserHolds` and `tenantPlaneMayHold` (the pinned test
 * compares the three role names and the clauses below to Go's source).
 */
function satisfies(c: Claims, required: string): boolean {
	if (!ALL_PERMISSIONS.includes(required)) return false;
	const platformManaged = PLATFORM_MANAGED_ROLE.has(required);
	const impersonating = c.isImpersonation === true;
	// IsPlatformOperator: slug-anchored AND not an impersonation token.
	const operator = c.isPlatform === true && !impersonating;
	// superUserHolds
	if (c.isSuperUser && (!platformManaged || c.isPlatform === true)) return true;
	// tenantPlaneMayHold: the three role-management names are held through the tenant plane only by an impersonation
	// session or a slug-anchored platform operator (LeadKart staff in the platform tenant); no company member holds
	// them (the admin-tier rank rule is not modelled here, as before).
	const tenantPlane = platformManaged ? impersonating || operator : true;
	if (c.permissions.includes(required)) {
		if (PLATFORM_RESERVED.has(required) && required !== TENANT_ADMIN) return operator;
		if (tenantPlane) return true;
	}
	if (tenantPlane && c.permissions.includes(TENANT_ADMIN) && !PLATFORM_RESERVED.has(required))
		return true;
	if (operator)
		return (PLATFORM_EQUIVALENTS[required] ?? []).some((eq) => c.permissions.includes(eq));
	return false;
}

/** Go `EffectivePermissions`: every catalogue name the caller satisfies, sorted. */
export function effectivePermissions(c: Claims): string[] {
	return ALL_PERMISSIONS.filter((name) => satisfies(c, name)).sort();
}

/** Go `Rank.Tier`: 0 owner, 1-10 admin, 11-20 manager, 21-30 team lead, 31-99 user. */
export function tierOfRank(rank: number): NonNullable<Capabilities['tier']> {
	if (rank < 0) return 'user';
	if (rank === 0) return 'owner';
	if (rank <= 10) return 'admin';
	if (rank <= 20) return 'manager';
	if (rank <= 30) return 'team_lead';
	return 'user';
}

// ── The seeded roles (role_catalog.go `DefaultRoleCatalog`), bundle by bundle ──────────────────────

const tasksMember = [P.tasksRead, P.tasksManage];
const tasksManager = [P.tasksRead, P.tasksReadAll, P.tasksManage, P.tasksReassign];
const dispatchOps = [P.dispatchRead, P.dispatchManage];
const ordersFull = [
	P.ordersQuotationsRead,
	P.ordersQuotationsManage,
	P.ordersOrdersRead,
	P.ordersOrdersManage,
	P.ordersPaymentsRead,
	P.ordersPaymentsRecord,
	P.ordersInvoicesRead
];
const ordersExec = [
	P.ordersQuotationsRead,
	P.ordersQuotationsManage,
	P.ordersOrdersRead,
	P.ordersPaymentsRead,
	P.ordersPaymentsRecord,
	P.ordersInvoicesRead
];
const ordersRead = [
	P.ordersQuotationsRead,
	P.ordersOrdersRead,
	P.ordersPaymentsRead,
	P.ordersInvoicesRead
];
const notificationsInbox = [P.notificationsRead, P.notificationsManage];
const elevation = [P.identityMetaRequestPermissionElevation];
const directory = [P.identityUsersView, P.identityRolesView];
const approver = [P.identityRolesApprove];
const crmManager = [P.crmLeadsRead, P.crmLeadsReadAll, P.crmLeadsAssign, P.crmLeadsManage];
const crmExec = [P.crmLeadsRead, P.crmLeadsManage];
const invRead = [P.inventoryCatalogRead, P.inventoryStockRead];

export interface SeededRole {
	level: number;
	grants: readonly string[];
}

const SPECS: Record<string, SeededRole> = {
	'Company Owner': {
		level: 0,
		grants: [TENANT_ADMIN, ...tasksManager, ...dispatchOps, ...ordersFull]
	},
	Administrator: { level: 10, grants: [TENANT_ADMIN, ...tasksManager] },
	'Office Administrator': {
		level: 10,
		grants: [TENANT_ADMIN, ...invRead, ...tasksManager, ...ordersRead]
	},
	'Senior Manager': {
		level: 15,
		grants: [
			...tasksManager,
			...directory,
			...approver,
			...crmManager,
			...invRead,
			P.dispatchRead,
			...ordersRead
		]
	},
	'Sales Manager': {
		level: 20,
		grants: [...invRead, ...tasksManager, ...ordersFull, ...directory, ...approver, ...crmManager]
	},
	'Purchase Manager': {
		level: 20,
		grants: [
			P.inventoryCatalogManage,
			P.inventoryStockManage,
			...tasksManager,
			...directory,
			...approver
		]
	},
	'Dispatch Manager': {
		level: 20,
		grants: [
			...tasksManager,
			...dispatchOps,
			...directory,
			...approver,
			P.ordersOrdersRead,
			P.inventoryStockRead
		]
	},
	'HR Manager': {
		level: 20,
		grants: [...tasksManager, ...directory, ...approver, P.identityUsersUpdate]
	},
	'Team Lead': {
		level: 30,
		grants: [...directory, ...approver, ...crmExec, P.tasksRead, P.tasksManage, P.tasksReassign]
	},
	'Office Executive': { level: 50, grants: tasksMember },
	'Sales Executive': { level: 50, grants: [...tasksMember, ...ordersExec, ...crmExec] },
	'Purchase Executive': { level: 50, grants: tasksMember },
	'Dispatch Executive': { level: 50, grants: [...tasksMember, ...dispatchOps] },
	'HR Executive': { level: 50, grants: tasksMember }
};

/**
 * Go's post-loop: every role gets the notification inbox, and every role but the owner may request
 * a permission elevation (the owner's tenant.admin already implies it).
 */
export const SEEDED: Record<string, SeededRole> = Object.fromEntries(
	Object.entries(SPECS).map(([name, role]) => [
		name,
		{
			level: role.level,
			grants: [
				...role.grants,
				...notificationsInbox,
				...(name === 'Company Owner' ? [] : elevation)
			]
		}
	])
);

export type SeededRoleName = keyof typeof SPECS;

// ── Capabilities (the GET /v1/auth/me/capabilities body) ───────────────────────────────────────────

/** A Capabilities body with the given effective list as is: for tests that need a specific set. */
export function caps(
	effective: readonly string[],
	overrides: Partial<Capabilities> = {}
): Capabilities {
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
		must_change_password: false,
		password_policy: {
			min_length: 8,
			max_length: 1024,
			requires_uppercase: true,
			requires_lowercase: true,
			requires_digit: true,
			requires_symbol: true
		},
		...overrides
	};
}

/** What the JWT holds for a caller with these roles, extra grants and flags. */
export interface PersonaInput {
	roles?: readonly SeededRoleName[];
	/** Extra JWT permissions (an override grant, or an operator's `platform.*` names). */
	grants?: readonly string[];
	isPlatform?: boolean;
	isSuperUser?: boolean;
	/** Overrides the rank taken from the best role. */
	rank?: number;
}

/**
 * The caller Go would describe: JWT permissions = role grants + extra grants, effective list by
 * Go's rules, rank = the best (lowest) role level, tier from the rank.
 */
export function persona(input: PersonaInput = {}): Capabilities {
	const roles = input.roles ?? [];
	const permissions = [
		...new Set([...roles.flatMap((r) => SEEDED[r]!.grants), ...(input.grants ?? [])])
	];
	const rank =
		input.rank ?? (roles.length > 0 ? Math.min(...roles.map((r) => SEEDED[r]!.level)) : 99);
	return caps(
		effectivePermissions({
			permissions,
			isPlatform: input.isPlatform,
			isSuperUser: input.isSuperUser
		}),
		{
			permissions,
			is_platform: input.isPlatform ?? false,
			is_super_user: input.isSuperUser ?? false,
			tenant_slug: input.isPlatform ? 'platform' : 'acme',
			roles: roles.map((name, i) => ({ id: `role-${i}`, name, is_super_admin: false })),
			rank,
			tier: tierOfRank(rank)
		}
	);
}

// ── Named personas ─────────────────────────────────────────────────────────────────────────────────

export const OWNER = persona({ roles: ['Company Owner'] });
/** A tenant created today: Administrator holds `tenant.admin` (new tenants; ADR 0069 Q2). */
export const NEW_TENANT_ADMIN = persona({ roles: ['Administrator'] });
/**
 * A hand-picked set of read grants WITHOUT `tenant.admin`, for tests that need "can see these pages and
 * nothing else". It is an input to `persona({ grants })`, not a role Go seeds: no rank is claimed.
 */
export const READ_ONLY_GRANTS: readonly string[] = [
	P.identityTenantsView,
	P.identityUsersView,
	P.identityRolesView,
	P.crmLeadsRead,
	P.ordersQuotationsRead
];
export const SENIOR_MANAGER = persona({ roles: ['Senior Manager'] });
export const SALES_MANAGER = persona({ roles: ['Sales Manager'] });
export const PURCHASE_MANAGER = persona({ roles: ['Purchase Manager'] });
export const TEAM_LEAD = persona({ roles: ['Team Lead'] });
export const SALES_EXECUTIVE = persona({ roles: ['Sales Executive'] });
export const OFFICE_EXECUTIVE = persona({ roles: ['Office Executive'] });
/** A platform operator holding ONE `platform.*` name (Go adds the identity equivalents). */
export const OPERATOR_ONE_PERMISSION = persona({
	isPlatform: true,
	grants: [P.platformTenantsView]
});
/** A platform operator with the full `platform.*` set but not the super flag. */
export const OPERATOR_PLATFORM_ADMIN = persona({
	isPlatform: true,
	grants: [...PLATFORM_RESERVED].filter((n) => n.startsWith('platform.'))
});
/** `is_super_user`: Go answers every catalogue name. */
export const SUPER_USER = persona({ isPlatform: true, isSuperUser: true });
export const NO_PERMISSIONS = persona();
