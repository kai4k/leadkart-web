/**
 * Operator scope cookie management.
 *
 * `enterScope` POSTs to the BFF (`/api/operator/scope`), which resolves
 * the tenant slug server-side, sets the `lk_op_tenant` httpOnly cookie,
 * and returns 204 (no body) or a small body identifying the resolved
 * tenant. The frontend never sees the tenant UUID in the URL bar — only
 * the slug used in the request payload.
 *
 * `exitScope` clears the cookie via DELETE so subsequent Go calls are
 * unscoped again (platform context).
 *
 * Per CLAUDE.md rule 6 (components NEVER fetch — gateways do) and rule
 * 9/10 (slug-only URLs, scope via cookie). Spec reference:
 * `docs/superpowers/specs/2026-05-20-bff-cookie-auth-adr.md`.
 *
 * The BFF endpoint lives at `/api/operator/scope` (NOT `/api/v1/...`) but it is
 * still reached through the one API client (CSRF, the context fingerprint, error
 * mapping): the entering POST is exempt from the fingerprint check on the server,
 * the exiting DELETE is not.
 */
import { api } from '$api/client';
import { exitOperatorScope } from '$api/operator-scope';

export interface EnterScopeRequest {
	slug: string;
}

/** The BFF answers 204: the resolved tenant lives in the cookie, not in a body. */
export type EnterScopeResponse = Record<string, never>;

/**
 * Enter tenant scope. The BFF resolves `slug` → tenant UUID, sets the
 * `lk_op_tenant` httpOnly cookie, and the proxy auto-injects
 * `X-Tenant-Id` from that cookie on every subsequent Go call.
 *
 * Throws a typed [ApiError] subclass on non-2xx — callers pattern-match
 * (`NetworkError`, `AuthError`, `NotFoundError`, etc.).
 */
export async function enterScope(req: EnterScopeRequest): Promise<EnterScopeResponse> {
	await api.post('/operator/scope', req);
	return {};
}

/**
 * Exit tenant scope. Clears the `lk_op_tenant` cookie via DELETE (the one
 * shared implementation in `$api/operator-scope`). Throws on non-2xx;
 * callers typically treat any failure as "stay in scope, surface a toast".
 */
export function exitScope(): Promise<void> {
	return exitOperatorScope();
}
