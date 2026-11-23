/**
 * Zod schemas for operator-side tenant management.
 *
 * tenantDtoSchema is re-exported from the existing tenant feature
 * (lib/features/tenant) — the same DTO shape serves both tenant-own
 * settings and operator cross-tenant ops.
 *
 * Note: the tenant feature exports the schema as `tenantSchema`; we
 * re-export it here as `tenantDtoSchema` to match the operator module's
 * naming convention (dto suffix makes the gateway-boundary role explicit).
 */
import { z } from 'zod';
import {
	RegisterTenantRequest,
	SuspendTenantRequest,
	MarkTenantForDeletionRequest,
	RegisterTenantResponse
} from '#lib/api/generated/index.ts';
import {
	companyNameField,
	formEmailField,
	newPasswordField,
	personNameField,
	reasonField,
	slugField
} from '#lib/api/request-schema.ts';
import { DEFAULT_PASSWORD_RULES, unmetPasswordRules } from '#lib/utils/password-policy.ts';
import { tenantSchema } from '#lib/features/tenant/schemas.ts';

export { tenantSchema as tenantDtoSchema } from '#lib/features/tenant/schemas.ts';

/**
 * Built from the generated request: its slug / name bounds stand.
 * Added here: the shared e-mail rule, no leading/trailing dash in a slug, names must not be empty, the shared password rule plus the default policy's classes.
 */
export const registerTenantRequestSchema = RegisterTenantRequest.extend({
	// Go's own slug rule (common/slug: 3-63, no double dash), which is narrower than the contract's 2-100.
	slug: slugField,
	legal_name: companyNameField,
	display_name: companyNameField,
	admin_email: formEmailField,
	// Go always checks the DEFAULT policy at registration (register_tenant.go), so this form, and only this one,
	// holds the first admin's password to the default's classes too. Each unmet class is its own issue (the rule code
	// is the message: `fieldMessageText` turns it into the sentence).
	admin_password: newPasswordField.superRefine((password, ctx) => {
		for (const code of unmetPasswordRules(password, DEFAULT_PASSWORD_RULES))
			if (code !== 'min_length') ctx.addIssue({ code: 'custom', message: code });
	}),
	admin_first_name: personNameField,
	admin_last_name: personNameField
}).strict();

export const registerTenantResponseSchema = RegisterTenantResponse;

export const suspendTenantRequestSchema = SuspendTenantRequest.extend({
	reason: reasonField
}).strict();

export const markForDeletionRequestSchema = MarkTenantForDeletionRequest.extend({
	reason: reasonField
}).strict();

export const listAllTenantsResponseSchema = z.object({
	tenants: z.array(tenantSchema)
});
