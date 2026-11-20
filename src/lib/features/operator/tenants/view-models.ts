import type { TenantDto } from './types';

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
	return tenant.status === 'pending_deletion';
}
