import type { TenantDto } from './types';

export function canSuspend(tenant: TenantDto): boolean {
	return tenant.status === 'active';
}

export function canActivate(tenant: TenantDto): boolean {
	return tenant.status === 'suspended';
}
