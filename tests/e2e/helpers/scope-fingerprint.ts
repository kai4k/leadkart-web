/**
 * The tenant-context fingerprint of the signed-in browser, computed the way the server does it
 * (`scopeFingerprint` in src/lib/server/scope.ts): HMAC-SHA256 with the server's scope secret over
 * `scope-context:<person id>:<tenant id | none>`. Written out here on purpose: a spec that speaks to
 * the proxy needs a value it can trust independently of the code under test, and this pins the
 * format. The secret is the one playwright.config.ts gives the e2e server.
 *
 * It describes the COOKIES' current context (what the proxy compares against), read from the
 * browser context's cookies; a spec that wants "the context a tab showed earlier" calls this
 * before the cookie changes and keeps the value.
 */
import { createHmac } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';

export const E2E_SCOPE_COOKIE_SECRET = 'e2e-only-scope-cookie-secret-0123456789abcdef';

export const SCOPE_CONTEXT_HEADER = 'x-lk-scope-context';

const decodePart = (jwtLike: string, index: number): Record<string, unknown> =>
	JSON.parse(Buffer.from(jwtLike.split('.')[index] ?? '', 'base64url').toString('utf8')) as Record<
		string,
		unknown
	>;

export async function currentFingerprint(context: BrowserContext): Promise<string> {
	const cookies = await context.cookies();
	const access = cookies.find((c) => c.name === 'lk_access')?.value;
	if (!access) return 'invalid';
	const person = String(decodePart(access, 1).sub ?? '');
	const scope = cookies.find((c) => c.name === 'lk_op_tenant')?.value;
	const tenant = scope ? String(decodePart(scope, 0).id ?? 'none') : 'none';
	return createHmac('sha256', E2E_SCOPE_COOKIE_SECRET)
		.update(`scope-context:${person}:${tenant}`)
		.digest('base64url');
}
