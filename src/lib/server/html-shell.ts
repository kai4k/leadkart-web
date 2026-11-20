import type { Handle } from '@sveltejs/kit/hooks';
import {
	decodePreferences,
	htmlAttributes,
	PREFERENCES_COOKIE
} from '#lib/features/preferences/codec.ts';

const ATTRS_PLACEHOLDER = '%lk.html.attrs%';

/**
 * Fills `%lk.html.attrs%` in app.html with the eight `data-*` preference attributes, so the first
 * paint already carries the user's layout, colours and mode (no script, no flash).
 *
 * The `lk_ui` cookie is presentation only. It is decoded against the enum (see codec.ts); the text
 * written into the page is built from enum members, never from the cookie.
 */
export const htmlShellHandle: Handle = ({ event, resolve }) => {
	const preferences = decodePreferences(event.cookies.get(PREFERENCES_COOKIE));
	event.locals.preferences = preferences;
	const attrs = htmlAttributes(preferences);
	return resolve(event, {
		// A replacer function: the attribute text is inserted literally, no `$&` interpretation.
		transformPageChunk: ({ html }) => html.replace(ATTRS_PLACEHOLDER, () => attrs)
	});
};
