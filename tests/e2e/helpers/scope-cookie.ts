import { createHmac } from 'node:crypto';
import { TEST_PERSON_ID } from './fake-jwt.ts';

/**
 * Mint a signed `lk_op_tenant` cookie value for e2e specs.
 *
 * The app's signer (src/lib/server/scope.ts) reads SvelteKit-only config, so
 * it is not importable under Playwright. This replicates its two lines:
 * base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payload, secret)). The payload carries
 * `pid`, the person the cookie is bound to (the e2e session's person unless a spec says otherwise).
 * The secret must equal SCOPE_COOKIE_SECRET in playwright.config.ts.
 */
const E2E_SCOPE_SECRET = 'e2e-only-scope-cookie-secret-0123456789abcdef';

export function mintScopeCookie(
	scope: { id: string; slug: string; display_name: string },
	expiresInSeconds: number,
	personId: string = TEST_PERSON_ID
): string {
	const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
	const payload = Buffer.from(JSON.stringify({ ...scope, exp, pid: personId })).toString(
		'base64url'
	);
	const sig = createHmac('sha256', E2E_SCOPE_SECRET).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}
