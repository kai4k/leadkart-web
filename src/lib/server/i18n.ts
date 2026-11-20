import { addMessages } from 'svelte-i18n';
import en from '#lib/i18n/locales/en.json';
import hi from '#lib/i18n/locales/hi.json';

/**
 * Both dictionaries, added synchronously at server start. With no lazy loader in play,
 * svelte-i18n's `locale.set()` is synchronous, which the per-request locale in the root layout
 * relies on (see `lib/i18n/index.ts`). Server-only: the browser keeps loading one language lazily.
 */
export function addServerMessages(): void {
	addMessages('en', en);
	addMessages('hi', hi);
}
