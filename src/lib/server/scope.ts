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
import { config, isProd } from './config';
import { timingSafeEqualString } from './csrf';

const OP_TENANT_COOKIE = 'lk_op_tenant';

/** Stored in the cookie — both id + slug so the layout can render
 *  the active-context pill without round-tripping for display data. */
const scopeSchema = z.object({
	id: z.string().uuid(),
	slug: z.string().min(1).max(100),
	display_name: z.string().max(200)
});

export type OperatorScope = z.infer<typeof scopeSchema>;

function sign(payload: string): string {
	return createHmac('sha256', config.SCOPE_COOKIE_SECRET).update(payload).digest('base64url');
}

export function setOperatorScope(cookies: Cookies, scope: OperatorScope): void {
	const payload = Buffer.from(JSON.stringify(scopeSchema.parse(scope))).toString('base64url');
	cookies.set(OP_TENANT_COOKIE, `${payload}.${sign(payload)}`, {
		path: '/',
		httpOnly: true,
		secure: isProd(),
		sameSite: 'strict',
		maxAge: 8 * 3600
	});
}

/**
 * httpOnly does not stop a user from writing their own cookie, so the
 * value is only trusted when its HMAC verifies. The id is UUID-checked
 * because it is sent as `X-Tenant-Id` and placed in upstream URL paths.
 */
export function getOperatorScope(cookies: Cookies): OperatorScope | null {
	const raw = cookies.get(OP_TENANT_COOKIE);
	if (!raw) return null;
	const dot = raw.lastIndexOf('.');
	if (dot <= 0) return null;
	const payload = raw.slice(0, dot);
	if (!timingSafeEqualString(raw.slice(dot + 1), sign(payload))) return null;
	try {
		const parsed = scopeSchema.safeParse(
			JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
		);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function clearOperatorScope(cookies: Cookies): void {
	cookies.delete(OP_TENANT_COOKIE, { path: '/' });
}
