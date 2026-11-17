/**
 * Permission requests feature barrel — workflow for tenant admins to
 * request additional capabilities; operators approve/deny.
 */
export * from './api';
export * from './schemas';
export * from './view-models';
export { default as PermissionRequestsList } from './components/PermissionRequestsList.svelte';
export { default as PermissionRequestDetail } from './components/PermissionRequestDetail.svelte';
