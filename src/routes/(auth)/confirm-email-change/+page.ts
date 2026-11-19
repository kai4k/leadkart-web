/**
 * Confirm-email-change — universal load (runs client-side since
 * `(auth)` group has `ssr = false`).
 *
 * This route auto-POSTs the token from `?token=` to the BFF endpoint
 * `/auth/confirm-email-change`, which forwards to Go server-side. No
 * user form, no use:enhance, no manual $effect-on-mount — Svelte's
 * load lifecycle handles the one-shot fetch on navigation.
 *
 * BFF preserved: the browser POSTs to the BFF (`/auth/confirm-email-change`
 * +server.ts), which forwards to Go. Browser never talks to Go directly.
 *
 * Phases returned to the component:
 *   - 'missing' → no token in URL
 *   - 'success' → email updated
 *   - 'invalid' → Go refused the token (expired / consumed / malformed)
 *   - 'unreachable' → 5xx / 502 / 504 / network error: Go did not answer, the
 *     token is still valid, so the view offers a retry
 *   - 'rateLimited' → 429: same, wait and retry
 */
import type { PageLoad } from './$types';

export type ConfirmPhase = 'missing' | 'success' | 'invalid' | 'unreachable' | 'rateLimited';

export const load: PageLoad = async ({ url, fetch }) => {
	const token = url.searchParams.get('token') ?? '';
	if (!token) return { phase: 'missing' as ConfirmPhase };

	try {
		const resp = await fetch('/auth/confirm-email-change', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token })
		});
		if (resp.ok || resp.status === 204) {
			return { phase: 'success' as ConfirmPhase };
		}
		if (resp.status === 429) return { phase: 'rateLimited' as ConfirmPhase };
		if (resp.status >= 500) return { phase: 'unreachable' as ConfirmPhase };
		return { phase: 'invalid' as ConfirmPhase };
	} catch {
		return { phase: 'unreachable' as ConfirmPhase };
	}
};
