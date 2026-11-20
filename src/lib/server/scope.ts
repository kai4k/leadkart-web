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
import { decodeJwtPrincipal } from '../api/jwt.ts';
import { config, isProd } from './config.ts';
import { ACCESS_COOKIE } from './cookies.ts';
import { timingSafeEqualString } from './csrf.ts';

const OP_TENANT_COOKIE = 'lk_op_tenant';

/** Stored in the cookie — both id + slug so the layout can render
 *  the active-context pill without round-tripping for display data. */
const scopeSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().min(1).max(100),
	display_name: z.string().max(200)
});

/**
 * The signed payload: the scope, its expiry (unix seconds) and `pid`, the person who entered the
 * context. A cookie written before `pid` existed fails this schema, so it reads as `invalid`
 * (fail closed) and never as a valid context.
 */
const payloadSchema = scopeSchema.extend({ exp: z.number().int(), pid: z.string().min(1) });

export type OperatorScope = z.infer<typeof scopeSchema>;

/** Signed lifetime of a scope. */
export const SCOPE_TTL_SECONDS = 8 * 3600;

/**
 * The cookie outlives the signed expiry by an hour. If both were equal the
 * browser would drop the cookie at the same moment the scope expires, the
 * server would read `none` and silently run calls in the operator's home
 * tenant. With the grace hour an expired scope is still presented, read as
 * `invalid`, and fails closed.
 */
export const SCOPE_COOKIE_MAX_AGE_SECONDS = SCOPE_TTL_SECONDS + 3600;

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

/**
 * The person the access cookie belongs to (its `sub`), or null without a readable one. The scope
 * cookie is bound to this person: it is read back only for the same person, so a copy replayed
 * from another account's browser (or one left behind by a previous sign-in) is never a context.
 */
function callerPersonId(cookies: Cookies): string | null {
	const access = cookies.get(ACCESS_COOKIE());
	if (!access) return null;
	try {
		return decodeJwtPrincipal(access).personId;
	} catch {
		return null;
	}
}

/** Signs the caller's context into the cookie. Throws when there is no signed-in caller to bind it to. */
export function setOperatorScope(cookies: Cookies, scope: OperatorScope): void {
	const pid = callerPersonId(cookies);
	if (pid === null) throw new Error('operator scope needs a signed-in caller to bind to');
	const exp = Math.floor(Date.now() / 1000) + SCOPE_TTL_SECONDS;
	const payload = Buffer.from(JSON.stringify({ ...scopeSchema.parse(scope), exp, pid })).toString(
		'base64url'
	);
	cookies.set(OP_TENANT_COOKIE, `${payload}.${sign(payload)}`, {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'strict',
		maxAge: SCOPE_COOKIE_MAX_AGE_SECONDS
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
		const caller = callerPersonId(cookies);
		if (caller === null || !timingSafeEqualString(parsed.data.pid, caller)) {
			return { state: 'invalid' };
		}
		const { id, slug, display_name } = parsed.data;
		return { state: 'valid', scope: { id, slug, display_name } };
	} catch {
		return { state: 'invalid' };
	}
}

/**
 * What a page sends with every API call to say which context it is showing: an opaque keyed hash
 * of the scope cookie's tenant id (HMAC with the server secret, domain-separated from the cookie
 * signature), or `none` / `invalid`. It reveals nothing to scripts or logs: the tenant id cannot be
 * recovered without the secret. The proxy and the form actions compare it with the cookie's own
 * fingerprint, so a tab never writes into a tenant it is not showing.
 */
export function scopeFingerprint(reading: ScopeReading): string {
	if (reading.state !== 'valid') return reading.state;
	return createHmac('sha256', config.SCOPE_COOKIE_SECRET)
		.update(`scope-context:${reading.scope.id}`)
		.digest('base64url');
}

/** Scope when valid, otherwise null — use `readOperatorScope` where invalid must fail closed. */
export function getOperatorScope(cookies: Cookies): OperatorScope | null {
	const reading = readOperatorScope(cookies);
	return reading.state === 'valid' ? reading.scope : null;
}

export function clearOperatorScope(cookies: Cookies): void {
	cookies.delete(OP_TENANT_COOKIE, { path: '/' });
}
