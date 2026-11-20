/**
 * What each tenant-settings section needs, straight from Go's PATCH routes
 * (`internal/identity/ports/http.go`): the password policy needs `identity.tenants.update_settings`,
 * every other section `identity.tenants.update`. ONE table, read by the save action (before any write
 * to Go) and by the form (whether to show the save button).
 */
import { P } from '#lib/features/auth/permissions.ts';

export const TENANT_SECTION_PERMISSION = {
	profile: P.identityTenantsUpdate,
	statutory: P.identityTenantsUpdate,
	'admin-contact': P.identityTenantsUpdate,
	'display-preferences': P.identityTenantsUpdate,
	settings: P.identityTenantsUpdateSettings
} as const;

/** The sections a tenant-settings form can save (the gateway's `TENANT_SECTIONS` has the same keys). */
export type TenantSectionId = keyof typeof TENANT_SECTION_PERMISSION;
