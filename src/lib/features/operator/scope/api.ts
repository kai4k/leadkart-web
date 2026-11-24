/**
 * Operator scope cookie management.
 *
 * `enterScope` POSTs to the BFF (`/api/operator/scope`), which resolves
 * the tenant slug server-side, sets the `lk_op_tenant` httpOnly cookie,
 * and answers with the fingerprint of the context it now names (the
 * layout is expected to commit exactly that). The frontend never sees
 * the tenant UUID in the URL bar — only the slug used in the request payload.
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
import { api } from '#lib/api/client.ts';
import { exitOperatorScope, scopeChangeSchema } from '#lib/api/operator-scope.ts';

export interface EnterScopeRequest {
	slug: string;
}

/**
 * Enter tenant scope; resolves to the NEW context fingerprint. The BFF resolves `slug` → tenant UUID, sets the
 * `lk_op_tenant` httpOnly cookie, and the proxy auto-injects
 * `X-Tenant-Id` from that cookie on every subsequent Go call.
 *
 * Throws a typed [ApiError] subclass on non-2xx — callers pattern-match
 * (`NetworkError`, `AuthError`, `NotFoundError`, etc.).
 */
export async function enterScope(req: EnterScopeRequest): Promise<string> {
	return (await api.postJson('/operator/scope', req, scopeChangeSchema)).scope_context;
}

/**
 * Exit tenant scope. Clears the `lk_op_tenant` cookie via DELETE (the one
 * shared implementation in `#lib/api/operator-scope.ts`). Throws on non-2xx;
 * callers typically treat any failure as "stay in scope, surface a toast".
 */
export function exitScope(): Promise<string> {
	return exitOperatorScope();
}
