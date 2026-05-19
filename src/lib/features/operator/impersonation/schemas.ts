/**
 * Zod schemas for operator-side impersonation sessions.
 *
 * Four schemas:
 *   createImpersonationSessionRequestSchema — POST body; strict, reason ≥10, duration optional 1-240
 *   createImpersonationSessionResponseSchema — 201 body
 *   impersonationSessionDtoSchema — full DTO shape returned by GET /sessions
 *   listImpersonationSessionsResponseSchema — GET /sessions wrapper
 */
import { z } from 'zod';

export const createImpersonationSessionRequestSchema = z
	.object({
		target_tenant_id: z.string().min(1),
		reason: z.string().min(10).max(500),
		duration_minutes: z.number().int().min(1).max(240).optional()
	})
	.strict();

export const createImpersonationSessionResponseSchema = z.object({
	session_id: z.string(),
	expires_at_utc: z.string()
});

export const impersonationSessionDtoSchema = z.object({
	session_id: z.string(),
	operator_id: z.string(),
	target_tenant_id: z.string(),
	reason: z.string(),
	created_at: z.string(),
	expires_at: z.string()
});

export const listImpersonationSessionsResponseSchema = z.object({
	sessions: z.array(impersonationSessionDtoSchema)
});
