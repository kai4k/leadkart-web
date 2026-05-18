import {
	getTenant,
	registerTenant as registerApi,
	suspendTenant as suspendApi,
	activateTenant as activateApi,
	markForDeletion as markApi,
	restoreTenant as restoreApi
} from '$features/operator/tenants/api';
import type {
	TenantDto,
	RegisterTenantRequest,
	RegisterTenantResponse
} from '$features/operator/tenants/types';

export type OperatorTenantsStatus = 'idle' | 'loading' | 'ready' | 'mutating' | 'error';

/**
 * Until the backend exposes GET /v1/tenants (list), this store
 * operates as a one-tenant cache fed by manual lookup-by-ID. The
 * `list` field is a one-element array (or empty) so list-view
 * components can iterate without special-casing.
 *
 * Once backend ships the list endpoint, replace `lookupById` with a
 * proper `load()` that populates `list` with the full collection.
 */
export class OperatorTenantsStore {
	list = $state<TenantDto[]>([]);
	current = $state<TenantDto | null>(null);
	status = $state<OperatorTenantsStatus>('idle');
	error = $state<string | null>(null);

	async lookupById(tenantId: string): Promise<void> {
		const trimmed = tenantId.trim();
		if (!trimmed) {
			this.list = [];
			this.error = null;
			return;
		}
		this.status = 'loading';
		this.error = null;
		try {
			const tenant = await getTenant(trimmed);
			this.list = [tenant];
			this.status = 'ready';
		} catch (e) {
			this.list = [];
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to look up tenant';
		}
	}

	async loadDetail(tenantId: string): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			this.current = await getTenant(tenantId);
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load tenant';
		}
	}

	async register(req: RegisterTenantRequest): Promise<RegisterTenantResponse> {
		this.status = 'mutating';
		try {
			const resp = await registerApi(req);
			this.status = 'ready';
			return resp;
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to register tenant';
			throw e;
		}
	}

	async suspend(tenantId: string, reason: string): Promise<void> {
		await this.mutate(() => suspendApi(tenantId, { reason }), tenantId);
	}
	async activate(tenantId: string): Promise<void> {
		await this.mutate(() => activateApi(tenantId), tenantId);
	}
	async markForDeletion(tenantId: string, reason: string): Promise<void> {
		await this.mutate(() => markApi(tenantId, { reason }), tenantId);
	}
	async restore(tenantId: string): Promise<void> {
		await this.mutate(() => restoreApi(tenantId), tenantId);
	}

	reset(): void {
		this.list = [];
		this.current = null;
		this.status = 'idle';
		this.error = null;
	}

	private async mutate(op: () => Promise<void>, tenantId: string): Promise<void> {
		this.status = 'mutating';
		try {
			await op();
			const fresh = await getTenant(tenantId);
			if (this.current?.id === tenantId) this.current = fresh;
			const idx = this.list.findIndex((t) => t.id === tenantId);
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

export const operatorTenants = new OperatorTenantsStore();
