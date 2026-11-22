/**
 * What a field's error says, from ONE place: the only way a field message reaches the screen. It arrives in one of
 * two shapes, and `fieldMessageText` turns each into the sentence the user reads:
 *
 *   - an i18n KEY (`auth.errors.emailRequired`): what a request schema carries as its message. The schema is shared
 *     with server actions, which cannot call `$_`, so the stable key travels and the renderer translates it;
 *   - an API CODE (`required`, `too_long`, `invalid_characters`): the Go API names a refused field with a code,
 *     never a sentence.
 *
 * Anything else is NOT shown: a Zod default for a rule outside the few `zodDefaultKey` names, a sentence nobody
 * put in the catalogue, a code this table does not know, a key `en.json` lacks, a key outside the error namespaces,
 * a key that names a branch or a sentence with a placeholder all read `form.invalid`. There is no branch that returns
 * the message itself, so no library or server text reaches a user whatever a schema forgot.
 * (A unit test enumerates every key the schemas can produce and fails on one the catalogue lacks.)
 */
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

const CODE_KEYS: Record<string, string> = {
	required: 'form.required',
	too_long: 'form.tooLong',
	invalid_characters: 'form.invalidCharacters',
	// value-object refusals (identity/ports/errcodes.go FieldCode*): one code each, the copy states the format
	invalid_gstin: 'form.errors.gstinInvalid',
	invalid_pan: 'form.errors.panInvalid',
	invalid_drug_licence: 'form.errors.drugLicenceInvalid',
	invalid_phone: 'form.errors.phoneInvalid',
	// the postal address names its part (`address.pincode`): required / too_long above, these two below
	invalid_pincode: 'form.errors.pinInvalid',
	invalid_city: 'form.errors.cityPincodeMismatch',
	// caught on this side only: the PAN typed is not the PAN inside the GSTIN (Go answers a field-less `tenant_invalid`)
	gstin_pan_mismatch: 'form.errors.gstinPanMismatch',
	// the whole-address fallback under `address`
	invalid_address: 'form.errors.addressInvalid',
	// `revoked` of the permission overrides: a name listed in both arrays
	also_granted: 'form.errors.alsoGranted',
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
/** The catalogue branches a field message may read from: `form.*`, `errors.*`, `<feature>.errors.*`. */
const ERROR_NAMESPACE = /^(?:form\.|(?:[a-z][A-Za-z0-9]*\.)*errors\.)/;

export const isCopyKey = (message: string): boolean => KEY_SHAPE.test(message);

/**
 * The library's own English default for a rule nobody gave a key (zod 4 `en` locale: "Too big: expected string to
 * have <=500 characters"), read as the RULE it names, never shown. Only a length ceiling, a minimum length and a
 * numeric floor / ceiling are known; every other default (an enum, a format, a type) is not.
 */
const ZOD_LENGTH_CEILING = /^Too big: expected (?:string|array|set) to have <=\d+ /;
const ZOD_NUMBER_CEILING = /^Too big: expected number to be <=?-?[\d.]+$/;
const ZOD_LENGTH_FLOOR = /^Too small: expected (?:string|array|set) to have >=(\d+) /;
const ZOD_NUMBER_FLOOR = /^Too small: expected number to be (>=?)(-?[\d.]+)$/;

function zodDefaultKey(message: string): string | undefined {
	if (ZOD_LENGTH_CEILING.test(message)) return 'form.tooLong';
	if (ZOD_NUMBER_CEILING.test(message)) return 'form.tooLarge';
	const length = ZOD_LENGTH_FLOOR.exec(message);
	if (length) return Number(length[1]) <= 1 ? 'form.required' : 'form.tooShort';
	const floor = ZOD_NUMBER_FLOOR.exec(message);
	if (floor) {
		const [, op, n] = floor;
		if (op === '>=' && n === '0') return 'form.errors.notNegative';
		if (op === '>=' && n === '1') return 'form.errors.atLeastOne';
		if (op === '>' && n === '0') return 'form.errors.greaterThanZero';
		return 'form.tooSmall';
	}
	return undefined;
}

/**
 * A catalogue lookup that is copy: a string with no placeholder (`{min}` would reach the screen raw), from the error
 * namespaces. A lookup that finds nothing answers with the key itself (a missing key), a branch answers with an object.
 */
function copyAt(key: string, t: (key: string) => string): string | undefined {
	const text: unknown = t(key);
	return typeof text === 'string' && text !== '' && text !== key && !text.includes('{')
		? text
		: undefined;
}

export function fieldMessageText(message: string, t: (key: string) => string): string {
	const codeKey = CODE_KEYS[message] ?? zodDefaultKey(message);
	if (codeKey) return copyAt(codeKey, t) ?? t('form.invalid');
	if (isCopyKey(message) && ERROR_NAMESPACE.test(message))
		return copyAt(message, t) ?? t('form.invalid');
	return t('form.invalid');
}

export function fieldErrorCopy(message: string): string {
	return fieldMessageText(message, (key) => get(_)(key));
}

export function fieldErrorsCopy(fields: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fieldErrorCopy(v)]));
}
