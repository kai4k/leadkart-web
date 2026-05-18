import type { TenantDto } from './types';

export type LifecycleVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function tenantLifecycleBadge(tenant: TenantDto): {
	label: string;
	variant: LifecycleVariant;
} {
	switch (tenant.status) {
		case 'active':
			return { label: 'Active', variant: 'success' };
		case 'suspended':
			return { label: 'Suspended', variant: 'warning' };
		case 'marked_for_deletion':
			return { label: 'Marked for deletion', variant: 'danger' };
		case 'pending':
			return { label: 'Pending', variant: 'info' };
		default:
			return { label: tenant.status, variant: 'neutral' };
	}
}

export function canSuspend(tenant: TenantDto): boolean {
	return tenant.status === 'active';
}

export function canActivate(tenant: TenantDto): boolean {
	return tenant.status === 'suspended';
}

export function canMarkForDeletion(tenant: TenantDto): boolean {
	return tenant.status === 'active' || tenant.status === 'suspended';
}

export function canRestore(tenant: TenantDto): boolean {
	return tenant.status === 'marked_for_deletion';
}
