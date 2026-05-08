import { z } from 'zod';

/**
 * Auth feature Zod schemas — used for both client-side form validation
 * AND runtime API response validation (industry canon: Stripe SDK,
 * tRPC, TanStack Query all do schema-at-the-boundary).
 *
 * Without this, a backend rename like `tenant_id` → `tenantId` breaks
 * the SPA at usage time, deep in the call stack. Validating at the
 * boundary surfaces the contract drift immediately.
 */

export const loginRequestSchema = z.object({
	email: z.string().min(1, 'Email is required').email('Invalid email format'),
	password: z.string().min(1, 'Password is required')
});

export const loginResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	access_token_expires_at: z.string(),
	person_id: z.string(),
	tenant_id: z.string(),
	membership_id: z.string()
});

export const refreshResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	access_token_expires_at: z.string()
});

export type LoginRequestInput = z.input<typeof loginRequestSchema>;
export type LoginRequest = z.output<typeof loginRequestSchema>;
export type LoginResponseValidated = z.output<typeof loginResponseSchema>;
export type RefreshResponseValidated = z.output<typeof refreshResponseSchema>;

/**
 * Password-reset request (anonymous) — email-only. The server ALWAYS
 * returns 204 regardless of whether the address is registered (Auth0 /
 * Okta canon: defeat account enumeration). Schema-level email validation
 * still gates obviously-malformed input client-side.
 */
export const requestPasswordResetSchema = z.object({
	email: z.string().min(1, 'Email is required').email('Invalid email format')
});

/**
 * Reset-password (anonymous) — token + new password. Server enforces
 * the full password policy (length, breach check, same-as-current);
 * client validates only structural minimums. 8 is the absolute floor
 * across leadkart-go's seeded password policies.
 */
export const resetPasswordSchema = z.object({
	token: z.string().min(1, 'Reset token is required'),
	new_password: z.string().min(8, 'Password must be at least 8 characters')
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

/**
 * Request email change (authenticated). Server emails a confirmation
 * link to the NEW address; the addressee clicks → confirmEmailChange
 * runs anonymously with the token.
 */
export const requestEmailChangeSchema = z.object({
	new_email: z.string().min(1, 'Email is required').email('Invalid email format')
});

/**
 * Confirm email change (anonymous, token-driven). Token arrives via
 * the URL ?token= param on the confirm-email-change route.
 */
export const confirmEmailChangeSchema = z.object({
	token: z.string().min(1, 'Confirmation token is required')
});

export type RequestPasswordResetInput = z.input<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type RequestEmailChangeInput = z.input<typeof requestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.input<typeof confirmEmailChangeSchema>;
