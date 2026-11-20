import { addMessages } from 'svelte-i18n';
import en from '#lib/i18n/locales/en.json';
import hi from '#lib/i18n/locales/hi.json';
import { ENABLED_LOCALES, type AppLocale } from '#lib/i18n/index.ts';

const DICTIONARIES: Record<AppLocale, Parameters<typeof addMessages>[1]> = { en, hi };

/**
 * The dictionaries of the ENABLED locales, added synchronously at server start. With no lazy
 * loader in play, svelte-i18n's `locale.set()` is synchronous, which the per-request locale in the
 * root layout relies on (see `lib/i18n/index.ts`). A disabled locale is not added. Server-only:
 * the browser loads its dictionary lazily.
 */
export function addServerMessages(enabled: readonly AppLocale[] = ENABLED_LOCALES): void {
	for (const locale of enabled) addMessages(locale, DICTIONARIES[locale]);
}
