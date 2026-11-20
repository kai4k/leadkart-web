/**
 * Barrel - public surface of this feature module.
 */
export { default as TenantActionPanel } from './components/TenantActionPanel.svelte';
export { default as SuspendDialog } from './components/SuspendDialog.svelte';
export { default as MarkForDeletionDialog } from './components/MarkForDeletionDialog.svelte';
export { default as TenantsList } from './components/TenantsList.svelte';
export {
	registerTenantRequestSchema,
	registerTenantResponseSchema,
	suspendTenantRequestSchema,
	markForDeletionRequestSchema,
	tenantDtoSchema,
	listAllTenantsResponseSchema
} from './schemas.ts';
export { canSuspend, canActivate, canMarkForDeletion, canRestore } from './view-models.ts';
export { tenantsListQuery } from './queries.ts';
export type { TenantDto } from './types.ts';
