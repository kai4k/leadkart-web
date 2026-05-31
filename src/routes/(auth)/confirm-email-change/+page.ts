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
 *   - 'invalid' → token expired/consumed/malformed (or network error)
 */
import type { PageLoad } from './$types';

export type ConfirmPhase = 'missing' | 'success' | 'invalid';

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
		return { phase: 'invalid' as ConfirmPhase };
	} catch {
		return { phase: 'invalid' as ConfirmPhase };
	}
};
