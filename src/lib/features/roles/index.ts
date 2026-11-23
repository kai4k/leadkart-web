/**
 * Roles feature barrel — RBAC role + capability assignment surface.
 */
export * from './api';
export * from './schemas';
export * from './types';
export * from './view-models';
export * from './queries';
export * from './permissions-catalogue';
export { createRolePermissions } from './role-permissions.svelte.ts';
export { default as RolesList } from './components/RolesList.svelte';
export { default as PermissionTree } from './components/PermissionTree.svelte';
export { default as PermissionPicker } from './components/PermissionPicker.svelte';
export { default as RolePropertiesCard } from './components/RolePropertiesCard.svelte';
