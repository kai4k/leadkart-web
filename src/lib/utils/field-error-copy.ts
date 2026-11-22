/**
 * What a field's error says, from ONE place: the only way a field message reaches the screen. It arrives in one of
 * two shapes, and `fieldMessageText` turns each into the sentence the user reads:
 *
 *   - an i18n KEY (`auth.errors.emailRequired`): what a request schema carries as its message. The schema is shared
 *     with server actions, which cannot call `$_`, so the stable key travels and the renderer translates it;
 *   - an API CODE (`required`, `too_long`, `invalid_characters`): the Go API names a refused field with a code,
 *     never a sentence.
 *
 * Anything else is NOT shown: a Zod default ("Too small: expected string to have >=8 characters"), a sentence nobody
 * put in the catalogue, a code this table does not know, a key `en.json` lacks all read `form.invalid`. There is no
 * branch that returns the message itself, so no library or server text reaches a user whatever a schema forgot.
 * (A unit test enumerates every key the schemas can produce and fails on one the catalogue lacks.)
 */
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

const CODE_KEYS: Record<string, string> = {
	required: 'form.required',
	too_long: 'form.tooLong',
	invalid_characters: 'form.invalidCharacters',
	// the password rule codes of `password_policy_violation` (`errors.new_password: [min_length, ...]`)
	min_length: 'form.passwordRule.min_length',
	max_length: 'form.passwordRule.max_length',
	requires_uppercase: 'form.passwordRule.requires_uppercase',
	requires_lowercase: 'form.passwordRule.requires_lowercase',
	requires_digit: 'form.passwordRule.requires_digit',
	requires_symbol: 'form.passwordRule.requires_symbol'
};

/** `namespace.camelCase` path: letters and digits in dotted segments that each start with a letter. */
const KEY_SHAPE = /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/;

export const isCopyKey = (message: string): boolean => KEY_SHAPE.test(message);

export function fieldMessageText(message: string, t: (key: string) => string): string {
	const codeKey = CODE_KEYS[message];
	if (codeKey) return t(codeKey);
	if (isCopyKey(message)) {
		const text = t(message);
		// a catalogue lookup that finds nothing answers with the key itself: that is a missing key, never copy
		if (text && text !== message) return text;
	}
	return t('form.invalid');
}

export function fieldErrorCopy(message: string): string {
	return fieldMessageText(message, (key) => get(_)(key));
}

export function fieldErrorsCopy(fields: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fieldErrorCopy(v)]));
}
