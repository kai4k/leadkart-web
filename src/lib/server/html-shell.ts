import type { Handle } from '@sveltejs/kit/hooks';
import {
	decodePreferences,
	htmlAttributes,
	PREFERENCES_COOKIE
} from '#lib/features/preferences/codec.ts';
import { negotiateLocale } from '#lib/i18n/index.ts';

const ATTRS_PLACEHOLDER = '%lk.html.attrs%';
const LANG_PLACEHOLDER = '%lk.html.lang%';

/**
 * Fills the two `<html>` placeholders in app.html, so the first paint is already in the user's
 * layout, colours, mode and language (no script, no flash):
 *
 * - `%lk.html.attrs%`: the `data-*` preference attributes from the `lk_ui` cookie.
 * - `%lk.html.lang%`: the request's language, negotiated from `Accept-Language`.
 *
 * Both are request text. The cookie is decoded against the enum (see codec.ts) and the language is
 * reduced to one of the supported tags (see `negotiateLocale`); what is written into the page is
 * built from those enum members, never from the request.
 */
/**
 * Fills the placeholders inside the opening `<html …>` tag and nowhere else. The same text further
 * down the chunk is page content (a title, a name someone typed) and stays as it is; a chunk with
 * no `<html>` tag is returned untouched.
 */
function fillHtmlTag(html: string, attrs: string, locale: string): string {
	const start = html.indexOf('<html');
	if (start === -1) return html;
	const end = html.indexOf('>', start);
	if (end === -1) return html;
	// Replacer functions: the text is inserted literally, no `$&` interpretation.
	const tag = html
		.slice(start, end + 1)
		.replace(ATTRS_PLACEHOLDER, () => attrs)
		.replace(LANG_PLACEHOLDER, () => locale);
	return html.slice(0, start) + tag + html.slice(end + 1);
}

export const htmlShellHandle: Handle = ({ event, resolve }) => {
	const preferences = decodePreferences(event.cookies.get(PREFERENCES_COOKIE));
	const locale = negotiateLocale(event.request.headers.get('accept-language'));
	event.locals.preferences = preferences;
	event.locals.locale = locale;
	const attrs = htmlAttributes(preferences);
	return resolve(event, {
		transformPageChunk: ({ html }) => fillHtmlTag(html, attrs, locale)
	});
};
