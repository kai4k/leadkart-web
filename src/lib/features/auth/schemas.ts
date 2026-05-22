import { z } from 'zod';

/**
 * CapabilitiesDto — wire shape of GET /v1/auth/me/capabilities per ADR 0038 N1.
 * The backend does NOT send a `tier` field — tier is derived client-side via
 * `deriveTier()` in capabilities.ts from `is_platform`, `is_super_user`, and
 * `permissions`. permissions drive per-item visibility. is_super_user
 * short-circuits all permission checks.
 */
export const capabilitiesSchema = z.object({
	person_id: z.string(),
	membership_id: z.string(),
	tenant_id: z.string(),
	tenant_slug: z.string(),
	email: z.string(),
	first_name: z.string(),
	last_name: z.string(),
	is_platform: z.boolean(),
	is_super_user: z.boolean(),
	permissions: z.array(z.string()),
	roles: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			is_super_admin: z.boolean()
		})
	)
});

/**
 * Auth feature Zod schemas — used for both client-side form validation
 * AND runtime API response validation (industry canon: Stripe SDK,
 * tRPC, TanStack Query all do schema-at-the-boundary).
 *
 * Surfaces shipped:
 *   - login              (request + ack)
 *   - change password    (authenticated, requires current password)
 *   - reset password     (public, requires old password + email)
 *
 * Self-serve registration + email-link reset + email-change remain
 * disabled — see api.ts header.
 */

export const loginRequestSchema = z.object({
	email: z.string().min(1, 'Email is required').email('Invalid email format'),
	password: z.string().min(1, 'Password is required')
});

/**
 * Reset password (public, no auth) — user proves identity by knowing
 * their email + old password, then sets a new one. Surfaced at
 * /reset-password so users who skipped change-password buried in
 * settings can self-serve from the signin page.
 *
 * The server still enforces password policy (length, breach checks,
 * "must differ from current") — this schema just catches blank inputs
 * before the round-trip.
 */
export const resetWithOldPasswordSchema = z.object({
	email: z.string().min(1, 'Email is required').email('Invalid email format'),
	old_password: z.string().min(1, 'Old password is required'),
	new_password: z.string().min(8, 'Password must be at least 8 characters')
});

/**
 * BFF login success acknowledgement — browser-visible login response.
 * Tokens are set as httpOnly cookies by the BFF; the browser only sees ok:true.
 */
export const loginOkSchema = z.object({ ok: z.literal(true) });

/**
 * Change password (authenticated) — both current + new are required.
 * Domain enforcement of "new must differ from current" lives server-
 * side; this schema only catches blank inputs.
 */
export const changePasswordSchema = z.object({
	current_password: z.string().min(1, 'Current password is required'),
	new_password: z.string().min(8, 'Password must be at least 8 characters')
});

export type LoginRequestInput = z.input<typeof loginRequestSchema>;
export type LoginRequest = z.output<typeof loginRequestSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ResetWithOldPasswordInput = z.input<typeof resetWithOldPasswordSchema>;
export type ResetWithOldPasswordRequest = z.output<typeof resetWithOldPasswordSchema>;

/**
 * UserDto — wire shape of GET /v1/users/:membership_id.
 * Mirrors identity/ports/dto.go UserDto exactly.
 */
export const userDtoSchema = z.object({
	membership_id: z.string(),
	person_id: z.string(),
	tenant_id: z.string(),
	email: z.string().email(),
	first_name: z.string(),
	last_name: z.string(),
	status: z.enum(['active', 'inactive', 'pending']),
	designation: z.string().optional().default(''),
	department: z.string().optional().default(''),
	status_message: z.string().optional().default(''),
	joined_at: z.string(),
	left_at: z.string().nullable().optional(),
	reports_to: z.string().nullable().optional(),
	role_ids: z.array(z.string())
});

/**
 * SessionDto — wire shape of a single session entry from
 * GET /v1/sessions. Mirrors identity/ports/dto.go SessionDto.
 */
export const sessionDtoSchema = z.object({
	family_id: z.string(),
	tenant_id: z.string(),
	device_label: z.string(),
	created_at: z.string(),
	last_used_at: z.string()
});

/**
 * ListSessionsResponse — wire shape of GET /v1/sessions.
 */
export const listSessionsResponseSchema = z.object({
	sessions: z.array(sessionDtoSchema)
});

/**
 * UpdateProfileRequest — strict schema so extra fields (e.g. first_name,
 * email) are caught at the gateway boundary before reaching the server.
 * Only the three editable fields are accepted.
 */
export const updateProfileRequestSchema = z
	.object({
		designation: z.string().max(120),
		department: z.string().max(120),
		status_message: z.string().max(280)
	})
	.strict();
