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
 * The BFF endpoint lives at `/api/operator/scope` (NOT `/api/v1/...`),
 * so this gateway speaks to the SvelteKit Node server directly rather
 * than going through the `api.*` JSON helper which targets the Go API.
 * The `fetch` call here is canon-legal — gateways MAY use `fetch`
 * because they ARE the gateway layer (see CLAUDE.md "Banned" section).
 */
import { ApiError, type ApiErrorBody } from '$api/errors';
import { getCsrfToken } from '$api/csrf';

export interface EnterScopeRequest {
	slug: string;
}

/** Response is best-effort — the BFF may return 204 No Content. */
export interface EnterScopeResponse {
	tenant_id?: string;
	tenant_slug?: string;
}

const SCOPE_PATH = '/api/operator/scope';

async function readErrorBody(resp: Response): Promise<ApiErrorBody | null> {
	try {
		const text = await resp.text();
		return text.length > 0 ? (JSON.parse(text) as ApiErrorBody) : null;
	} catch {
		return null;
	}
}

/**
 * Enter tenant scope. The BFF resolves `slug` → tenant UUID, sets the
 * `lk_op_tenant` httpOnly cookie, and the proxy auto-injects
 * `X-Tenant-Id` from that cookie on every subsequent Go call.
 *
 * Throws a typed [ApiError] subclass on non-2xx — callers pattern-match
 * (`NetworkError`, `AuthError`, `NotFoundError`, etc.).
 */
export async function enterScope(req: EnterScopeRequest): Promise<EnterScopeResponse> {
	let resp: Response;
	try {
		resp = await fetch(SCOPE_PATH, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				'X-CSRF-Token': getCsrfToken()
			},
			credentials: 'same-origin',
			body: JSON.stringify(req)
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}

	if (!resp.ok) {
		const body = await readErrorBody(resp);
		throw ApiError.fromResponse(resp, body);
	}

	// 204 No Content or empty body → return {} (the resolved tenant lives
	// in the cookie, not the body — callers don't need it).
	if (resp.status === 204) return {};
	const text = await resp.text();
	if (text.length === 0) return {};
	try {
		return JSON.parse(text) as EnterScopeResponse;
	} catch {
		return {};
	}
}

/**
 * Exit tenant scope. Clears the `lk_op_tenant` cookie via DELETE.
 * Throws on non-2xx; callers typically treat any failure as "stay in
 * scope, surface a toast".
 */
export async function exitScope(): Promise<void> {
	let resp: Response;
	try {
		resp = await fetch(SCOPE_PATH, {
			method: 'DELETE',
			headers: {
				Accept: 'application/json',
				'X-CSRF-Token': getCsrfToken()
			},
			credentials: 'same-origin'
		});
	} catch (cause) {
		throw ApiError.transport(cause);
	}

	if (!resp.ok) {
		const body = await readErrorBody(resp);
		throw ApiError.fromResponse(resp, body);
	}
}
