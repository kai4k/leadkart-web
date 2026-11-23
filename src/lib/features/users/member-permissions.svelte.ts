import { ACTION, session } from '$features/auth';

/**
 * What the caller may do to a team member, by the permission each Go route needs
 * (`ACTION` in auth/permissions.ts, one rule everywhere). Reactive getters over the session:
 * an action is shown when its permission is held, and Go's per-target refusal
 * (`insufficient_rank`, `self_modification_forbidden`, ...) is rendered through the copy map;
 * the UI does not predict rank outcomes. One factory for the list, the detail page and its tabs.
 */
export function createMemberPermissions() {
	const may = (rule: readonly string[]): boolean => session.canAny(...rule);
	return {
		get create() {
			return may(ACTION.userCreate);
		},
		/** Profile edit, set / remove manager. */
		get update() {
			return may(ACTION.userUpdate);
		},
		/** The roles drawer assigns and revokes: either route is reason enough to open it. */
		get manageRoles() {
			return may(ACTION.roleAssign) || may(ACTION.roleRevoke);
		},
		get assignRoles() {
			return may(ACTION.roleAssign);
		},
		get revokeRoles() {
			return may(ACTION.roleRevoke);
		},
		/**
		 * Go's `PATCH /v1/users/{id}/permission-overrides` REPLACES the whole set and needs the `overrides_version` of
		 * the read it was made from: the panel reads the member first (`GET /v1/users/{id}` sends the overrides only
		 * to a caller who may act on that member) and seeds the form from it.
		 */
		get overrides() {
			return may(ACTION.userOverrides);
		},
		get deactivate() {
			return may(ACTION.userDeactivate);
		},
		get reactivate() {
			return may(ACTION.userReactivate);
		}
	};
}
