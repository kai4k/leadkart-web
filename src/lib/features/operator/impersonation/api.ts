/**
 * Gateway layer for operator-side impersonation sessions.
 *
 * Three functions, one per backend endpoint:
 *   startImpersonation  — POST /v1/platform/impersonation/sessions
 *   endImpersonation    — DELETE /v1/platform/impersonation/sessions/{sessionId}
 *   listImpersonationSessions — GET /v1/platform/impersonation/sessions
 *
 * Reads and the create call Zod-parse the response at the boundary so upstream
 * callers receive typed DTOs, never raw unknowns; end is 204.
 */
import { seg } from '#lib/utils/path-segment.ts';
import { api } from '#lib/api/client.ts';
import {
	createImpersonationSessionResponseSchema,
	listImpersonationSessionsResponseSchema
} from './schemas';
import type {
	CreateImpersonationSessionRequest,
	CreateImpersonationSessionResponse,
	ListImpersonationSessionsResponse
} from './types';

/** POST /v1/platform/impersonation/sessions — open an audited session. */
export function startImpersonation(
	req: CreateImpersonationSessionRequest
): Promise<CreateImpersonationSessionResponse> {
	return api.postJson(
		'/v1/platform/impersonation/sessions',
		req,
		createImpersonationSessionResponseSchema
	);
}

/** DELETE /v1/platform/impersonation/sessions/{sessionId} — close the session. */
export async function endImpersonation(sessionId: string): Promise<void> {
	await api.delete(`/v1/platform/impersonation/sessions/${seg(sessionId)}`);
}

/** GET /v1/platform/impersonation/sessions — list active sessions for the caller. */
export function listImpersonationSessions(
	signal?: AbortSignal
): Promise<ListImpersonationSessionsResponse> {
	return api.get('/v1/platform/impersonation/sessions', listImpersonationSessionsResponseSchema, {
		signal
	});
}
