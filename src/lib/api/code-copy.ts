/**
 * THE table from a Go (or BFF) error code to the i18n key of its user copy, read by both the
 * client describer (`describeError`: toasts, banners) and the server-action failure helper
 * (`goFailureKey`), so a form posting through a server action says the same thing as one posting
 * through the API client. English and Hindi live in the locale files under `errors.code.<code>`.
 * A code not listed here gets the generic line of its status class; Go's own text is never shown.
 * Adding a code is one entry here plus its two lines. The locale files load lazily (see
 * `i18n/index.ts`), so this module never imports one: before a locale is ready there is no answer
 * (`undefined`), never the key and never Go's text.
 */
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';

const CODES = [
	// BFF
	'csrf_mismatch',
	'scope_changed',
	'scope_invalid',
	// An operator acting inside another tenant
	'tenant_scope_not_supported',
	'tenant_scope_read_only',
	'tenant_scope_forbidden',
	'tenant_scope_conflict',
	'tenant_not_active',
	'tenant_suspended',
	// Authority
	'forbidden',
	'insufficient_rank',
	'ownership_authority_required',
	'grant_exceeds_authority',
	'self_modification_forbidden',
	'impersonation_not_allowed',
	'admin_tier_required',
	// Members and roles
	'last_owner_protected',
	'owner_protected',
	'person_memberships_changing',
	'member_roles_inconsistent',
	'manager_not_eligible',
	'role_in_use',
	'role_name_taken',
	'schedule_class_name_taken',
	'role_system_default',
	'role_parent_not_eligible',
	'role_level_breaks_reporting',
	'role_hierarchy_cycle',
	'role_hierarchy_self_reference',
	'role_hierarchy_edge_already_exists',
	'invalid_email',
	'invalid_slug',
	'email_already_taken',
	'email_has_active_membership',
	'person_active_elsewhere',
	'concurrency_conflict',
	'platform_tenant_undeletable',
	// Permission requests
	'permission_unknown',
	'permission_not_requestable',
	'permission_request_requester_inactive',
	'permission_request_pending_exists',
	'permission_request_not_pending',
	'permission_request_invalid',
	// Inventory (inventory/ports/dto.go: ErrCodeInsufficientStock, ErrCodeBatchExpired, ErrCodeProductHasStock)
	'already_exists',
	'product_sku_taken_by_inactive',
	'insufficient_stock',
	'batch_expired',
	'product_has_live_stock',
	// Dispatch gate (orders/ports/errcodes.go, dispatch/ports/errcodes.go; Go ADR 0072)
	'order_not_invoiced',
	'order_not_dispatchable',
	'order_stock_expired',
	'order_stock_not_held',
	'order_stock_mismatch',
	// Account and search
	'incorrect_current_password',
	// authn/session_policy.go: every route but change-password and capabilities while the flag is set
	'password_change_required',
	'service_busy',
	'session_not_found',
	'current_session_unknown',
	'overrides_changed',
	'search_category_forbidden',
	'invalid_search_include'
] as const;

export const GO_CODE_KEYS: ReadonlyMap<string, string> = new Map(
	CODES.map((code) => [code, `errors.code.${code}`])
);

/** The i18n key for a code, or undefined when the table does not know it. */
export function goCodeKey(code: string | undefined): string | undefined {
	return code === undefined ? undefined : GO_CODE_KEYS.get(code);
}

/**
 * The user's text for a code in the active locale. `undefined` when the table does not know the code
 * AND while no locale is ready (an error before i18n started): the caller then falls back to its own
 * built-in line for the code or the status, which says what happened; a generic "something went
 * wrong" would hide a line the caller has.
 */
export function codeCopy(code: string | undefined): string | undefined {
	const key = goCodeKey(code);
	if (key === undefined) return undefined;
	try {
		const text = get(_)(key);
		if (typeof text === 'string' && text !== key) return text;
	} catch {
		// no locale yet
	}
	return undefined;
}
