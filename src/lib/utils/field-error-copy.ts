/**
 * The Go API names a refused field with a CODE (`required`, `too_long`, `invalid_characters`), never a sentence.
 * `fieldErrorCopy` turns the code into the field's message; a string that is not one of the codes (a message
 * the web wrote itself, a code this table does not know) is returned as it is.
 */
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

const KEYS: Record<string, string> = {
	required: 'form.required',
	too_long: 'form.tooLong',
	invalid_characters: 'form.invalidCharacters'
};

export function fieldErrorCopy(code: string): string {
	const key = KEYS[code];
	return key ? get(_)(key) : code;
}

export function fieldErrorsCopy(fields: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fieldErrorCopy(v)]));
}
