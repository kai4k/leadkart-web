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
