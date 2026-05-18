import { z } from 'zod';

/**
 * Auth feature Zod schemas — used for both client-side form validation
 * AND runtime API response validation (industry canon: Stripe SDK,
 * tRPC, TanStack Query all do schema-at-the-boundary).
 *
 * Surface intentionally minimal: login + refresh response shapes +
 * change-password input. Self-serve register / forgot / reset /
 * email-change flows are NOT exposed in this SPA (admin tooling
 * only — see api.ts header for the auth-model rationale).
 */

export const loginRequestSchema = z.object({
	email: z.string().min(1, 'Email is required').email('Invalid email format'),
	password: z.string().min(1, 'Password is required')
});

/**
 * Wire shape of /v1/auth/login + /v1/auth/refresh. leadkart-go does
 * NOT return person_id / tenant_id / membership_id in the body —
 * those come from the JWT's custom claims (decoded via
 * `lib/api/jwt.ts`). Schema mirrors LoginResponse in
 * `internal/identity/ports/dto.go` exactly.
 */
export const loginResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	access_token_expires_at: z.string(),
	token_type: z.string()
});

export const refreshResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	access_token_expires_at: z.string(),
	token_type: z.string()
});

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
export type LoginResponseValidated = z.output<typeof loginResponseSchema>;
export type RefreshResponseValidated = z.output<typeof refreshResponseSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

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
	designation: z.string(),
	department: z.string(),
	status_message: z.string(),
	joined_at: z.string(),
	left_at: z.string().nullable(),
	reports_to: z.string().nullable(),
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
export const updateProfileRequestSchema = z.object({
	designation: z.string().max(120),
	department: z.string().max(120),
	status_message: z.string().max(280)
});

export type UserDto = z.output<typeof userDtoSchema>;
export type SessionDto = z.output<typeof sessionDtoSchema>;
export type ListSessionsResponse = z.output<typeof listSessionsResponseSchema>;
export type UpdateProfileRequest = z.output<typeof updateProfileRequestSchema>;
