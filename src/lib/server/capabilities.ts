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

type Capabilities = z.output<typeof capabilitiesSchema>;

/**
 * Capabilities of the signed-in caller, or `null` when Go answered without
 * usable ones (401 after refresh, non-2xx, unexpected shape). Throws 503 when
 * Go is unreachable or too slow: the session is fine, so callers must not
 * bounce the user to /signin.
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
		throw error(503, 'Service temporarily unavailable');
	}
	const parsed = body === null ? null : capabilitiesSchema.safeParse(body);
	return parsed?.success ? parsed.data : null;
}
