/**
 * Tenant feature types — derived from the Zod schemas in `./schemas.ts`,
 * which are in turn derived from the generated Go contract
 * (`#lib/api/generated`). No hand-written copy of a DTO shape lives here.
 */
import type { z } from 'zod';
import type {
	adminAddressSchema,
	passwordPolicySchema,
	tenantSchema,
	updateTenantAdminContactSchema,
	updateTenantDisplayPreferencesSchema,
	updateTenantProfileSchema,
	updateTenantSettingsSchema,
	updateTenantStatutorySchema
} from './schemas';

export type { TenantStatus } from './schemas';

export type AdminAddress = z.output<typeof adminAddressSchema>;
export type PasswordPolicy = z.output<typeof passwordPolicySchema>;
export type Tenant = z.output<typeof tenantSchema>;

export type UpdateTenantProfileRequest = z.output<typeof updateTenantProfileSchema>;
export type UpdateTenantStatutoryRequest = z.output<typeof updateTenantStatutorySchema>;
export type UpdateTenantAdminContactRequest = z.output<typeof updateTenantAdminContactSchema>;
export type UpdateTenantSettingsRequest = z.output<typeof updateTenantSettingsSchema>;
export type UpdateTenantDisplayPreferencesRequest = z.output<
	typeof updateTenantDisplayPreferencesSchema
>;
