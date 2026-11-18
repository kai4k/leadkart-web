/**
 * Operator scope cookie — represents the tenant context a platform
 * operator is currently acting on. Sensitive identifiers (UUID, slug)
 * NEVER appear in the URL bar; they live in this httpOnly cookie and
 * are injected as the X-Tenant-Id header on every BFF→Go request.
 *
 * Pattern reference: Stripe "Test Mode" toggle, Linear "Workspace
 * switcher", GitHub Enterprise "Switch enterprise" — the active scope
 * is server-side context, not URL state.
 */

import { createHmac } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';
import { config, isProd } from './config.ts';
import { timingSafeEqualString } from './csrf.ts';

const OP_TENANT_COOKIE = 'lk_op_tenant';

/** Stored in the cookie — both id + slug so the layout can render
 *  the active-context pill without round-tripping for display data. */
const scopeSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().min(1).max(100),
	display_name: z.string().max(200)
});

/** The signed payload: the scope plus its expiry (unix seconds). */
const payloadSchema = scopeSchema.extend({ exp: z.number().int() });

export type OperatorScope = z.infer<typeof scopeSchema>;

/** Cookie lifetime and signed expiry share one constant. */
const SCOPE_TTL_SECONDS = 8 * 3600;

/**
 * `none`: no scope cookie. `invalid`: a cookie is present but failed
 * verification (tampered, secret rotated, expired) — callers must fail
 * closed, never fall back to the operator's home tenant.
 */
export type ScopeReading =
	| { state: 'none' }
	| { state: 'valid'; scope: OperatorScope }
	| { state: 'invalid' };

function sign(payload: string): string {
	return createHmac('sha256', config.SCOPE_COOKIE_SECRET).update(payload).digest('base64url');
}

export function setOperatorScope(cookies: Cookies, scope: OperatorScope): void {
	const exp = Math.floor(Date.now() / 1000) + SCOPE_TTL_SECONDS;
	const payload = Buffer.from(JSON.stringify({ ...scopeSchema.parse(scope), exp })).toString(
		'base64url'
	);
	cookies.set(OP_TENANT_COOKIE, `${payload}.${sign(payload)}`, {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'strict',
		maxAge: SCOPE_TTL_SECONDS
	});
}

/**
 * httpOnly does not stop a user from writing their own cookie, so the
 * value is only trusted when its HMAC verifies and it has not expired.
 * The id is UUID-checked because it is sent as `X-Tenant-Id` and placed
 * in upstream URL paths.
 */
export function readOperatorScope(cookies: Cookies): ScopeReading {
	const raw = cookies.get(OP_TENANT_COOKIE);
	if (!raw) return { state: 'none' };
	const dot = raw.lastIndexOf('.');
	if (dot <= 0) return { state: 'invalid' };
	const payload = raw.slice(0, dot);
	if (!timingSafeEqualString(raw.slice(dot + 1), sign(payload))) return { state: 'invalid' };
	try {
		const parsed = payloadSchema.safeParse(
			JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
		);
		if (!parsed.success || parsed.data.exp < Math.floor(Date.now() / 1000)) {
			return { state: 'invalid' };
		}
		const { id, slug, display_name } = parsed.data;
		return { state: 'valid', scope: { id, slug, display_name } };
	} catch {
		return { state: 'invalid' };
	}
}

/** Scope when valid, otherwise null — use `readOperatorScope` where invalid must fail closed. */
export function getOperatorScope(cookies: Cookies): OperatorScope | null {
	const reading = readOperatorScope(cookies);
	return reading.state === 'valid' ? reading.scope : null;
}

export function clearOperatorScope(cookies: Cookies): void {
	cookies.delete(OP_TENANT_COOKIE, { path: '/' });
}
