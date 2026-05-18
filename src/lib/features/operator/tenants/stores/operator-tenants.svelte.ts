import {
	getTenant,
	listTenants as listTenantsApi,
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

export class OperatorTenantsStore {
	/** Full collection from GET /v1/platform/tenants. */
	list = $state<TenantDto[]>([]);
	/** Client-side filter string — matched against slug / display_name / legal_name. */
	search = $state('');
	current = $state<TenantDto | null>(null);
	status = $state<OperatorTenantsStatus>('idle');
	error = $state<string | null>(null);

	/** Filtered view of list — use this in list-view components. */
	get filtered(): TenantDto[] {
		const q = this.search.trim().toLowerCase();
		if (!q) return this.list;
		return this.list.filter(
			(t) =>
				t.slug.toLowerCase().includes(q) ||
				t.display_name.toLowerCase().includes(q) ||
				t.legal_name.toLowerCase().includes(q)
		);
	}

	/** Load full tenant list from GET /v1/platform/tenants. */
	async load(): Promise<void> {
		this.status = 'loading';
		this.error = null;
		try {
			const resp = await listTenantsApi();
			this.list = resp.tenants;
			this.status = 'ready';
		} catch (e) {
			this.status = 'error';
			this.error = e instanceof Error ? e.message : 'Failed to load tenants';
		}
	}

	/** Direct UUID lookup — power-user fallback when the caller already has an ID. */
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
		this.search = '';
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
