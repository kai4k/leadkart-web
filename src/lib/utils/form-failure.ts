/**
 * The page-side reader of the ONE failure shape every server form action returns
 * (`failForm` in server/form-action.ts). A form never reaches into `form` by hand: it reads a
 * `FormFailure`, and asks it for the text of a field or of the banner, so the key / message
 * split lives here once.
 */
import { fieldMessageText } from '#lib/utils/field-error-copy.ts';

export type FormFailure<V extends object = Record<string, never>> = {
	/** What the user typed, to repopulate the form. */
	values: V;
	/** field -> i18n key. */
	fieldKeys: Record<string, string>;
	/** field -> text from a schema or from Go's own per-field answer. */
	fieldMessages: Record<string, string>;
	/** The banner line as an i18n key. */
	formErrorKey: string | null;
};

type Translate = (key: string) => string;

/** The failure carried by an action result, or null when the result is not one (success, no result). */
export function readFailure<V extends object = Record<string, never>>(
	form: unknown
): FormFailure<V> | null {
	if (typeof form !== 'object' || form === null) return null;
	const f = form as Partial<FormFailure<V>>;
	if (!('fieldKeys' in f) && !('formErrorKey' in f) && !('fieldMessages' in f)) return null;
	return {
		values: (f.values ?? {}) as V,
		fieldKeys: f.fieldKeys ?? {},
		fieldMessages: f.fieldMessages ?? {},
		formErrorKey: f.formErrorKey ?? null
	};
}

/**
 * The text to show under a field: its key translated, else the message that came with it (a
 * schema's key is translated, an API code mapped, a sentence kept: `fieldMessageText`).
 */
export function fieldText(
	failure: FormFailure<object> | null,
	field: string,
	t: Translate
): string | undefined {
	if (!failure) return undefined;
	const key = failure.fieldKeys[field];
	if (key) return t(key);
	const message = failure.fieldMessages[field];
	return message === undefined ? undefined : fieldMessageText(message, t);
}
