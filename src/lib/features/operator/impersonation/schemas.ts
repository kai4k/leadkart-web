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
import {
	CreateImpersonationSessionResponse,
	ImpersonationSessionDto,
	ListImpersonationSessionsResponse
} from '#lib/api/generated/index.ts';

export const createImpersonationSessionRequestSchema = z
	.object({
		target_tenant_id: z.string().min(1),
		reason: z.string().min(10).max(500),
		duration_minutes: z.number().int().min(1).max(240).optional()
	})
	.strict();

/** The access token in the 201 body is consumed by the BFF only; the browser keeps the id + expiry. */
export const createImpersonationSessionResponseSchema = CreateImpersonationSessionResponse.pick({
	session_id: true,
	expires_at_utc: true
});

export const impersonationSessionDtoSchema = ImpersonationSessionDto;

export const listImpersonationSessionsResponseSchema = ListImpersonationSessionsResponse;
