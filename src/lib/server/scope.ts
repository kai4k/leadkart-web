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

import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const OP_TENANT_COOKIE = 'lk_op_tenant';

/** Stored in the cookie — both id + slug so the layout can render
 *  the active-context pill without round-tripping for display data. */
export interface OperatorScope {
	id: string;
	slug: string;
	display_name: string;
}

export function setOperatorScope(cookies: Cookies, scope: OperatorScope): void {
	const secure = env.NODE_ENV === 'production';
	cookies.set(OP_TENANT_COOKIE, JSON.stringify(scope), {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'strict',
		maxAge: 8 * 3600
	});
}

export function getOperatorScope(cookies: Cookies): OperatorScope | null {
	const raw = cookies.get(OP_TENANT_COOKIE);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<OperatorScope>;
		if (typeof parsed.id !== 'string' || typeof parsed.slug !== 'string') return null;
		return {
			id: parsed.id,
			slug: parsed.slug,
			display_name: typeof parsed.display_name === 'string' ? parsed.display_name : parsed.slug
		};
	} catch {
		return null;
	}
}

export function clearOperatorScope(cookies: Cookies): void {
	cookies.delete(OP_TENANT_COOKIE, { path: '/' });
}
