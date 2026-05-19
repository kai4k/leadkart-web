/**
 * Inferred types for operator-side impersonation sessions.
 *
 * All types are derived via z.output<> so they stay in sync with
 * the Zod schemas at compile time — no manual duplication.
 */
import type { z } from 'zod';
import type {
	createImpersonationSessionRequestSchema,
	createImpersonationSessionResponseSchema,
	impersonationSessionDtoSchema,
	listImpersonationSessionsResponseSchema
} from './schemas';

export type CreateImpersonationSessionRequest = z.output<
	typeof createImpersonationSessionRequestSchema
>;
export type CreateImpersonationSessionResponse = z.output<
	typeof createImpersonationSessionResponseSchema
>;
export type ImpersonationSessionDto = z.output<typeof impersonationSessionDtoSchema>;
export type ListImpersonationSessionsResponse = z.output<
	typeof listImpersonationSessionsResponseSchema
>;
