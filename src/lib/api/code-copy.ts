/**
 * THE table from a Go (or BFF) error code to the i18n key of its user copy, read by both the
 * client describer (`describeError`: toasts, banners) and the server-action failure helper
 * (`goFailureKey`), so a form posting through a server action says the same thing as one posting
 * through the API client. English and Hindi live in the locale files under `errors.code.<code>`.
 * A code not listed here gets the generic line of its status class; Go's own text is never shown.
 * Adding a code is one entry here plus its two lines.
 */
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import en from '../i18n/locales/en.json';

const CODES = [
	// BFF
	'csrf_mismatch',
	// An operator acting inside another tenant
	'tenant_scope_not_supported',
	'tenant_scope_read_only',
	'tenant_scope_forbidden',
	'tenant_scope_conflict',
	'tenant_not_active',
	'tenant_has_dependents',
	// Authority
	'forbidden',
	'insufficient_rank',
	'ownership_authority_required',
	'grant_exceeds_authority',
	'self_modification_forbidden',
	'impersonation_not_allowed',
	'not_approver',
	// Members and roles
	'last_owner_protected',
	'owner_protected',
	'person_memberships_changing',
	'member_roles_inconsistent',
	'manager_not_eligible',
	'role_in_use',
	'role_deleted',
	'role_name_taken',
	'role_system_default',
	'role_parent_not_eligible',
	'role_level_breaks_reporting',
	// Permission requests
	'permission_not_requestable',
	'permission_request_requester_inactive',
	// Account and search
	'incorrect_current_password',
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

function lookup(tree: unknown, key: string): string | undefined {
	const hit = key
		.split('.')
		.reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
	return typeof hit === 'string' ? hit : undefined;
}

/**
 * The user's text for a code in the active locale. Before a locale is ready (a unit test, an error
 * before i18n started) the English line from the same file answers: never the key, never Go's text.
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
	return lookup(en, key);
}
