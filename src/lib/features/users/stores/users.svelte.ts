/**
 * UsersStore — list + mutation state for the tenant's member roster.
 * Mirrors ProfileStore / TenantStore patterns. Mutations throw so
 * callers (drawers, dialogs) can react; load() catches silently.
 *
 * Local roster is the source of truth for the list view; mutations
 * update locally + optionally refetch on next list view mount.
 */
import {
	listUsers,
	createUser as createUserApi,
	deactivateUser as deactivateUserApi,
	reactivateUser as reactivateUserApi,
	unlockUser as unlockUserApi,
	assignRole as assignRoleApi,
	revokeRole as revokeRoleApi,
	replacePermissionOverrides as replacePermissionOverridesApi,
	assignManager as assignManagerApi,
	removeManager as removeManagerApi,
	listRoles as listRolesApi,
	getUser
} from '$features/users/api';
import type {
	UserDto,
	RoleDto,
	CreateUserRequest,
	CreateUserResponse,
	ReplacePermissionOverridesRequest
} from '$features/users/types';

export type UsersStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class UsersStore {
	list = $state<UserDto[]>([]);
	roles = $state<RoleDto[]>([]);
	status = $state<UsersStatus>('idle');
	error = $state<string | null>(null);

	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const [{ users }, roles] = await Promise.all([listUsers(), listRolesApi()]);
			this.list = users;
			this.roles = roles;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load users';
		}
	}

	async refresh(): Promise<void> {
		try {
			const { users } = await listUsers();
			this.list = users;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to refresh users';
		}
	}

	async create(req: CreateUserRequest): Promise<CreateUserResponse> {
		this.status = 'mutating';
		try {
			const resp = await createUserApi(req);
			// Reload list to pick up the new member.
			const { users } = await listUsers();
			this.list = users;
			this.status = 'ready';
			return resp;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to create user';
			throw e;
		}
	}

	async deactivate(membershipId: string, reason: string): Promise<void> {
		await this.mutate(() => deactivateUserApi(membershipId, { reason }), membershipId);
	}

	async reactivate(membershipId: string): Promise<void> {
		await this.mutate(() => reactivateUserApi(membershipId), membershipId);
	}

	async unlock(membershipId: string): Promise<void> {
		await this.mutate(() => unlockUserApi(membershipId), membershipId);
	}

	async assignRole(membershipId: string, roleId: string): Promise<void> {
		await this.mutate(() => assignRoleApi(membershipId, { role_id: roleId }), membershipId);
	}

	async revokeRole(membershipId: string, roleId: string): Promise<void> {
		await this.mutate(() => revokeRoleApi(membershipId, roleId), membershipId);
	}

	async replacePermissionOverrides(
		membershipId: string,
		body: ReplacePermissionOverridesRequest
	): Promise<void> {
		await this.mutate(() => replacePermissionOverridesApi(membershipId, body), membershipId);
	}

	async assignManager(membershipId: string, managerId: string): Promise<void> {
		await this.mutate(
			() => assignManagerApi(membershipId, { manager_id: managerId }),
			membershipId
		);
	}

	async removeManager(membershipId: string): Promise<void> {
		await this.mutate(() => removeManagerApi(membershipId), membershipId);
	}

	reset(): void {
		this.list = [];
		this.roles = [];
		this.status = 'idle';
		this.error = null;
	}

	/**
	 * Runs a mutating gateway call + refreshes only the affected
	 * member's record (single GET, not a full list re-fetch).
	 */
	private async mutate(operation: () => Promise<void>, membershipId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await operation();
			const fresh = await getUser(membershipId);
			const idx = this.list.findIndex((u) => u.membership_id === membershipId);
			if (idx >= 0) {
				const next = this.list.slice();
				next[idx] = fresh;
				this.list = next;
			}
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Operation failed';
			throw e;
		}
	}
}

export const users = new UsersStore();
