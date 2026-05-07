/**
 * Client-side hooks per SvelteKit canon. Initialises i18n + the dark-
 * mode rune store on first paint. Server hooks are not used because
 * adapter-static produces a pure SPA bundle (no server runtime).
 *
 * https://svelte.dev/docs/kit/hooks#shared-hooks-handleerror
 */
import { initI18n } from '$lib/i18n';

initI18n();
