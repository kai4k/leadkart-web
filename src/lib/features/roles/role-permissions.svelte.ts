import { ACTION, session } from '#lib/features/auth/index.ts';

/**
 * What the caller may do to roles, by the permission each Go route needs (`ACTION` in
 * auth/permissions.ts). Reactive getters over the session. Built-in roles are read-only
 * (`isProtectedRole`, checked by the callers); every other refusal (`insufficient_rank`,
 * `role_in_use`, ...) is Go's, rendered through the copy map.
 */
export function createRolePermissions() {
	const may = (rule: readonly string[]): boolean => session.canAny(...rule);
	return {
		/** Offered in either context: `session.canAny` already drops the own-tenant name inside a tenant context. */
		get create() {
			return may(ACTION.roleCreate);
		},
		/** Rename / re-level, permissions, parent. */
		get update() {
			return may(ACTION.roleUpdate);
		},
		get delete() {
			return may(ACTION.roleDelete);
		}
	};
}
