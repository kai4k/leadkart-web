import type { ClientInit, HandleClientError } from '@sveltejs/kit/hooks';

/**
 * Client-side hooks per SvelteKit 3 canon. Initialises i18n on first paint.
 * handleError is kind-based: `app` (expected `error()`) errors keep the
 * defaults; `framework` (404s etc.) and unexpected errors are logged and
 * reshaped into a safe message for the nearest +error.svelte. In production
 * this is the integration point for an APM/error-tracking service (Sentry).
 *
 * Server-side hooks (silent session refresh, server i18n init) live in
 * hooks.server.ts.
 *
 * https://svelte.dev/docs/kit/hooks#shared-hooks-handleerror
 */
import { waitLocale } from 'svelte-i18n';
import { initI18n } from '#lib/i18n/index.ts';

// Kit's client `init` hook is awaited before hydration, so the locale is
// set before first paint (module-level init raced the first format call).
export const init: ClientInit = async () => {
	initI18n();
	await waitLocale();
};

export const handleError: HandleClientError = ({ kind, error, event }) => {
	// Kit 3 routes expected (`error(...)`) errors through this hook too.
	// Keep them on the defaults — only unexpected + framework errors
	// (404s, thrown exceptions) are logged and re-shaped here.
	if (kind === 'app') return;

	const status = kind === 'framework' ? error.status : 500;
	const message = kind === 'framework' ? error.message : 'Internal Error';

	// In production this is the integration point for Sentry / Datadog RUM.
	// For now: structured console log so the browser devtools give context.
	console.error('[handleError]', {
		status,
		message,
		pathname: event.url?.pathname,
		error
	});

	// Return a safe error object that SvelteKit passes to the nearest
	// +error.svelte as `page.error`. Do not expose internal stack traces
	// to the user — only the human-readable message.
	return {
		message:
			status === 404
				? 'Page not found'
				: status >= 500
					? 'Something went wrong on our end. Please try again.'
					: message
	};
};
