/**
 * The ONE server-side way to read the caller's capabilities from Go. Used by
 * the (app) layout load and by form actions, which are a separate entry point
 * from loads and so must authorise themselves.
 */
import { error, isHttpError, isRedirect, type Cookies } from '@sveltejs/kit';
// Schema module imported directly: the auth barrel re-exports .svelte components.
import type { z } from 'zod';
import { capabilitiesSchema } from '#lib/features/auth/schemas.ts';
import { goFetch, readGoJson } from './go.ts';
import { isUpstreamTimeout } from './proxy.ts';

type Capabilities = z.output<typeof capabilitiesSchema>;

/**
 * Capabilities of the signed-in caller, or `null` when Go answered without
 * usable ones (401 after refresh, non-2xx, unexpected shape). Throws 504 when
 * Go is too slow and 503 when it is unreachable: the session is fine, so
 * callers must not bounce the user to /signin.
 *
 * `requireAuth: false` so a failed refresh yields `null` instead of a redirect;
 * `scoped: false` because capabilities describe the caller, never the scoped tenant.
 */
export async function loadCapabilities(cookies: Cookies): Promise<Capabilities | null> {
	let body: unknown;
	try {
		const resp = await goFetch(cookies, '/v1/auth/me/capabilities', {
			requireAuth: false,
			scoped: false
		});
		body = resp.ok ? await readGoJson<unknown>(resp) : null;
	} catch (err) {
		if (isRedirect(err) || isHttpError(err)) throw err;
		if (isUpstreamTimeout(err)) throw error(504, 'Go API did not respond in time');
		throw error(503, 'Service temporarily unavailable');
	}
	if (body === null) return null;
	const parsed = capabilitiesSchema.safeParse(body);
	if (parsed.success) return parsed.data;
	// A contract mismatch must be visible, not a silent sign-out loop. Paths and Zod's messages
	// only — never the values (they are the caller's identity).
	const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
	console.error(
		`[capabilities] Go's capabilities response does not match the contract: ${issues.join('; ')}`
	);
	return null;
}
