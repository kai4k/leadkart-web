import { ACTION, session } from '$features/auth';

/**
 * What the caller may do to roles, by the permission each Go route needs (`ACTION` in
 * auth/permissions.ts). Reactive getters over the session. Built-in roles are read-only
 * (`isProtectedRole`, checked by the callers); every other refusal (`insufficient_rank`,
 * `role_in_use`, ...) is Go's, rendered through the copy map.
 */
export function createRolePermissions() {
	const may = (rule: readonly string[]): boolean => session.canAny(...rule);
	return {
		/** The create form is an own-tenant route (the nav config's `own` context): not offered in a tenant context. */
		get create() {
			return may(ACTION.roleCreate) && !session.inTenantContext;
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
