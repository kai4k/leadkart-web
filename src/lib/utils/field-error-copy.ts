/**
 * What a field's error says, from one place. A field's message reaches the screen in one of three
 * shapes, and `fieldMessageText` turns each into the sentence the user reads:
 *
 *   - an i18n KEY (`auth.errors.emailRequired`): what a request schema carries as its message. The
 *     schema is shared with server actions, which cannot call `$_`, so the stable key travels and
 *     the renderer translates it;
 *   - an API CODE (`required`, `too_long`, `invalid_characters`): the Go API names a refused field
 *     with a code, never a sentence;
 *   - anything else (a sentence the web wrote, Go's own text): returned as it is.
 */
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

const CODE_KEYS: Record<string, string> = {
	required: 'form.required',
	too_long: 'form.tooLong',
	invalid_characters: 'form.invalidCharacters'
};

/** `namespace.camelCase` path: letters and digits in dotted segments that each start with a letter. */
const KEY_SHAPE = /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/;

export const isCopyKey = (message: string): boolean => KEY_SHAPE.test(message);

export function fieldMessageText(message: string, t: (key: string) => string): string {
	const codeKey = CODE_KEYS[message];
	if (codeKey) return t(codeKey);
	return isCopyKey(message) ? t(message) : message;
}

export function fieldErrorCopy(message: string): string {
	return fieldMessageText(message, (key) => get(_)(key));
}

export function fieldErrorsCopy(fields: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fieldErrorCopy(v)]));
}
