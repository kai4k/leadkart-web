/**
 * Barrel - public surface of this feature module.
 */
export { default as TenantActionPanel } from './components/TenantActionPanel.svelte';
export { default as SuspendDialog } from './components/SuspendDialog.svelte';
export { default as TenantsList } from './components/TenantsList.svelte';
export {
	registerTenantRequestSchema,
	registerTenantResponseSchema,
	suspendTenantRequestSchema,
	tenantDtoSchema,
	listAllTenantsResponseSchema
} from './schemas.ts';
export { canSuspend, canActivate } from './view-models.ts';
export { tenantsListQuery } from './queries.ts';
export type { TenantDto } from './types.ts';
