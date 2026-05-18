/**
 * Gateway layer for operator-side impersonation sessions.
 *
 * Three functions, one per backend endpoint:
 *   startImpersonation  — POST /v1/platform/impersonation/sessions
 *   endImpersonation    — DELETE /v1/platform/impersonation/sessions/{sessionId}
 *   listImpersonationSessions — GET /v1/platform/impersonation/sessions
 *
 * Each function Zod-parses the response at the boundary so upstream
 * callers receive typed DTOs, never raw unknowns.
 */
import { api } from '$api/client';
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
export async function startImpersonation(
	req: CreateImpersonationSessionRequest
): Promise<CreateImpersonationSessionResponse> {
	const raw = await api.post<unknown>('/v1/platform/impersonation/sessions', req);
	return createImpersonationSessionResponseSchema.parse(raw);
}

/** DELETE /v1/platform/impersonation/sessions/{sessionId} — close the session. */
export async function endImpersonation(sessionId: string): Promise<void> {
	await api.delete<void>(`/v1/platform/impersonation/sessions/${sessionId}`);
}

/** GET /v1/platform/impersonation/sessions — list active sessions for the caller. */
export async function listImpersonationSessions(): Promise<ListImpersonationSessionsResponse> {
	const raw = await api.get<unknown>('/v1/platform/impersonation/sessions');
	return listImpersonationSessionsResponseSchema.parse(raw);
}
