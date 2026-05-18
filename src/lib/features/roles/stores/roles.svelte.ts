import {
	listRoles,
	getRole,
	createRole as createRoleApi,
	updateRole as updateRoleApi,
	replaceRolePermissions as replaceRolePermissionsApi,
	grantRolePermission as grantRolePermissionApi,
	revokeRolePermission as revokeRolePermissionApi,
	deleteRole as deleteRoleApi
} from '$features/roles/api';
import type {
	RoleDto,
	CreateRoleRequest,
	CreateRoleResponse,
	UpdateRoleRequest
} from '$features/roles/types';

export type RolesStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

export class RolesStore {
	list = $state<RoleDto[]>([]);
	status = $state<RolesStatus>('idle');
	error = $state<string | null>(null);

	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const { roles } = await listRoles();
			this.list = roles;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load roles';
		}
	}

	async refresh(): Promise<void> {
		try {
			const { roles } = await listRoles();
			this.list = roles;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to refresh roles';
		}
	}

	async create(req: CreateRoleRequest): Promise<CreateRoleResponse> {
		this.status = 'mutating';
		try {
			const resp = await createRoleApi(req);
			await this.refresh();
			this.status = 'ready';
			return resp;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to create role';
			throw e;
		}
	}

	async update(roleId: string, req: UpdateRoleRequest): Promise<void> {
		await this.mutate(() => updateRoleApi(roleId, req), roleId);
	}

	async setPermissions(roleId: string, permissions: string[]): Promise<void> {
		await this.mutate(() => replaceRolePermissionsApi(roleId, { permissions }), roleId);
	}

	async grantPermission(roleId: string, permission: string): Promise<void> {
		await this.mutate(() => grantRolePermissionApi(roleId, { permission }), roleId);
	}

	async revokePermission(roleId: string, permission: string): Promise<void> {
		await this.mutate(() => revokeRolePermissionApi(roleId, { permission }), roleId);
	}

	async delete(roleId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await deleteRoleApi(roleId);
			this.list = this.list.filter((r) => r.id !== roleId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to delete role';
			throw e;
		}
	}

	reset(): void {
		this.list = [];
		this.status = 'idle';
		this.error = null;
	}

	private async mutate(op: () => Promise<void>, roleId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await op();
			const fresh = await getRole(roleId);
			const idx = this.list.findIndex((r) => r.id === roleId);
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

export const roles = new RolesStore();
