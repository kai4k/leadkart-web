/**
 * svelte-i18n setup. `negotiateLocale` picks the request's language from `Accept-Language`
 * (`en` or `hi`); `initI18n` starts the library.
 *
 * Server: `hooks.server.ts` registers BOTH dictionaries synchronously (`lib/server/i18n.ts`), and
 * the root layout sets the library's locale from the request before it renders. Svelte renders the
 * tree in one synchronous pass, so no other request can change that global store mid-render; the
 * page is always written in the language of the request that asked for it, and `<html lang>`
 * (written by `htmlShellHandle`) says the same.
 *
 * Client: the locale files load lazily (one chunk per language) and the starting locale is the
 * server's own, read back from `<html lang>`.
 */
import { register, init } from 'svelte-i18n';

export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const FALLBACK_LOCALE: AppLocale = 'en';

// `Accept-Language` is request text: bound it before reading it. A real header is well under this.
const MAX_HEADER_LENGTH = 1024;
const MAX_ENTRIES = 32;

function supported(tag: string): AppLocale | undefined {
	const primary = tag.trim().toLowerCase().split('-', 1)[0];
	return SUPPORTED_LOCALES.find((l) => l === primary);
}

/** `q` of one entry: 1 when absent, undefined when present but not a number in [0, 1]. */
function qualityOf(params: string[]): number | undefined {
	for (const param of params) {
		const [key, value] = param.split('=', 2);
		if (key?.trim().toLowerCase() !== 'q') continue;
		const q = Number(value);
		return value?.trim() !== '' && Number.isFinite(q) && q >= 0 && q <= 1 ? q : undefined;
	}
	return 1;
}

/**
 * The highest-`q` supported language of an `Accept-Language` header (primary subtag only), ties by
 * order of appearance, `en` when nothing supported (or q=0) matches. Never throws.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): AppLocale {
	if (!acceptLanguage) return FALLBACK_LOCALE;
	let best: { locale: AppLocale; q: number } | undefined;
	const entries = acceptLanguage.slice(0, MAX_HEADER_LENGTH).split(',', MAX_ENTRIES);
	for (const entry of entries) {
		const [tag, ...params] = entry.split(';');
		const locale = supported(tag ?? '');
		const q = qualityOf(params);
		if (!locale || q === undefined || q === 0) continue;
		if (!best || q > best.q) best = { locale, q };
	}
	return best?.locale ?? FALLBACK_LOCALE;
}

/** The locale the server rendered the document in (`<html lang>`), for the client to start from. */
export function readDocumentLocale(): AppLocale {
	if (typeof document === 'undefined') return FALLBACK_LOCALE;
	return supported(document.documentElement.lang) ?? FALLBACK_LOCALE;
}

export function initI18n(initialLocale: AppLocale = FALLBACK_LOCALE): void {
	// The server has both dictionaries already (lib/server/i18n.ts); only the browser loads lazily.
	if (typeof window !== 'undefined') {
		register('en', () => import('./locales/en.json'));
		register('hi', () => import('./locales/hi.json'));
	}

	// svelte-i18n's `init()` returns a Promise (locale-load + dictionary ready). Components
	// subscribed to the `$_` store re-render when the dictionary populates, so nothing awaits
	// here; the client hook and the server init await `waitLocale()` themselves.
	void init({ fallbackLocale: FALLBACK_LOCALE, initialLocale });
}
