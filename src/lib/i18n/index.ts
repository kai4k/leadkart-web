/**
 * svelte-i18n setup — lazy-loaded locales registered at hooks.client
 * boot. Default locale: English. Hindi staged for v0.3+ when the BRD
 * says first multi-locale tenant lands.
 *
 * Per svelte-i18n docs: register locales with `register()` then call
 * `init()` with a fallback. Components consume via the `$_` rune-style
 * accessor (svelte-i18n exposes it as a store; Svelte 5 reactivity
 * picks it up).
 */
import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

const FALLBACK_LOCALE = 'en';

export function initI18n() {
	register('en', () => import('./locales/en.json'));
	register('hi', () => import('./locales/hi.json'));

	init({
		fallbackLocale: FALLBACK_LOCALE,
		initialLocale: getLocaleFromNavigator() ?? FALLBACK_LOCALE
	});
}
