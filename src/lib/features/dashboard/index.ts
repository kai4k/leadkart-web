/**
 * Dashboard feature barrel — purely composed feature (no API surface of
 * its own; reads from other features). Exempted from the api.ts
 * structural check in scripts/arch/check-feature-structure.mjs.
 *
 * Today the dashboard's only public surface is its components, which
 * routes import the dashboard components via this barrel.
 */
export { default as PlatformDashboard } from './components/PlatformDashboard.svelte';
export { default as TenantAdminDashboard } from './components/TenantAdminDashboard.svelte';
export { default as TenantUserDashboard } from './components/TenantUserDashboard.svelte';
