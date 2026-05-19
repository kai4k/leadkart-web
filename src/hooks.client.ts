/**
 * Client-side hooks per SvelteKit canon. Initialises i18n on first paint.
 * handleError captures unhandled errors at the route boundary and logs
 * them to the console in dev; in production this is the integration point
 * for an APM/error-tracking service (Sentry, etc.).
 *
 * Server hooks are not used because adapter-static produces a pure SPA
 * bundle (no server runtime).
 *
 * https://svelte.dev/docs/kit/hooks#shared-hooks-handleerror
 */
import type { HandleClientError } from '@sveltejs/kit';
import { initI18n } from '$lib/i18n';

initI18n();

export const handleError: HandleClientError = ({ error, event, status, message }) => {
	// In production this is the integration point for Sentry / Datadog RUM.
	// For now: structured console log so the browser devtools give context.
	console.error('[handleError]', {
		status,
		message,
		pathname: event.url?.pathname,
		error
	});

	// Return a safe error object that SvelteKit passes to the nearest
	// +error.svelte as `$page.error`. Do not expose internal stack traces
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
