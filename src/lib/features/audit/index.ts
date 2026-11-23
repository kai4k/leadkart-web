/**
 * Audit feature barrel: the caller's own activity and a tenant's activity, as Go serves them
 * (`/v1/auth/me/activity`, `/v1/tenants/{tenantId}/audit/events`). Go has no per-person feed.
 */
export * from './api';
export * from './schemas';
export * from './queries';
export { default as ActivityTimeline } from './components/ActivityTimeline.svelte';
