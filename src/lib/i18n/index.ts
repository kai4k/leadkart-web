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

export function initI18n(): void {
	register('en', () => import('./locales/en.json'));
	register('hi', () => import('./locales/hi.json'));

	// svelte-i18n's `init()` returns a Promise (locale-load + dictionary
	// ready). Components subscribed to the `$_` store reactively re-render
	// when the dictionary populates, so we don't need to await here —
	// `void` declares the intentional fire-and-forget (ESLint canon for
	// no-floating-promises per the rule's docs).
	void init({
		fallbackLocale: FALLBACK_LOCALE,
		initialLocale: getLocaleFromNavigator() ?? FALLBACK_LOCALE
	});
}
