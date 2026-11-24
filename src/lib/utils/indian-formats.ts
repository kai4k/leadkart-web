/**
 * The statutory and postal formats the LeadKart API enforces, as pure functions: a form tidies what a person typed
 * (Go does NOT normalise: it refuses " 29abcde1234f1z5 ") and tells them what is wrong before anything is sent.
 *
 * Every rule mirrors leadkart-go at 44ff2b16 and is NEVER STRICTER than it (a table test holds Go's own vectors):
 *   - GSTIN   internal/common/gst/gst.go               15 chars, pattern, state code 01-37 or 97, no checksum
 *   - PAN     internal/common/pan/pan.go                pattern + 4th letter one of PFHCATBLJG
 *   - GST+PAN internal/identity/domain/tenant/statutory.go   the PAN inside the GSTIN (characters 3-12) equals the PAN
 *   - licence internal/common/druglicence/druglicence.go    8-30 of A-Z 0-9 space / -, one letter and one digit
 *   - phone   internal/common/phone/phone.go            E.164, `+`, first digit 1-9, 8 to 15 digits in all
 *   - address internal/common/postaladdress/postaladdress.go   street 200 / city, district, state 80 / state code 4
 *             (BYTES, as Go counts), pincode `^[1-9][0-9]{5}$`; blank street, city, state, pincode refused
 * A blank value is "not declared" wherever Go accepts it (GSTIN, PAN, licence, phone, and a wholly blank address).
 *
 * Results are the API's own field CODES (`invalid_gstin`, `required`, `too_long`, ...), so a person reads the same
 * sentence whichever side caught it (`fieldMessageText`). No framework imports.
 */

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PAN_ENTITY_TYPES = 'PFHCATBLJG';
const DRUG_LICENCE_CHARS = /^[A-Z0-9 /-]+$/;
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
/** India Post: 6 digits, the first 1-9. */
export const PIN_PATTERN = /^[1-9][0-9]{5}$/;

/** Go's lengths are `len(string)`: UTF-8 bytes. */
const bytes = (text: string): number => new TextEncoder().encode(text).length;

/** ASCII-only upper-casing: `ß` must not become `SS` behind the person's back. */
const upperAscii = (text: string): string => text.replace(/[a-z]/g, (c) => c.toUpperCase());

// ---- tidy: what is written back into the input, so what is shown is what is sent ----------------------------------

/** GSTIN and PAN: no whitespace anywhere, capitals. */
export const tidyIdentifier = (text: string): string => upperAscii(text.replace(/\s+/g, ''));

/** Drug licence: trimmed, capitals; spaces inside are part of some state formats and stay. */
export const tidyDrugLicence = (text: string): string => upperAscii(text.trim());

/** A pincode is written "400 001" as often as "400001". */
export const tidyPincode = (text: string): string => text.replace(/\s+/g, '');

/** Address parts: Go trims them itself; the form shows the trimmed text. */
export const tidyText = (text: string): string => text.trim();

/**
 * A phone number for E.164. Spaces, hyphens, dots and brackets are dropped; a 10-digit Indian number, `0` + 10 digits
 * and `91` + 10 digits become `+91...`; anything starting with `+` is kept. What cannot be tidied into something Go
 * accepts is returned exactly as typed (and checked, and shown as an error): it is never turned into another number.
 */
export function tidyPhone(text: string): string {
	const typed = text;
	const compact = text.replace(/[\s\-().]/g, '');
	if (compact === '') return typed.trim() === '' ? '' : typed;
	if (compact.startsWith('+')) return E164_PATTERN.test(compact) ? compact : typed;
	if (!/^[0-9]+$/.test(compact)) return typed;
	let national: string | null = null;
	if (/^[0-9]{10}$/.test(compact)) national = compact;
	else if (/^0[0-9]{10}$/.test(compact)) national = compact.slice(1);
	else if (/^91[0-9]{10}$/.test(compact)) national = compact.slice(2);
	if (national === null) return typed;
	const candidate = `+91${national}`;
	return E164_PATTERN.test(candidate) ? candidate : typed;
}

// ---- check: null when Go would accept it, else the code Go answers with ------------------------------------------

export type FieldCode = string;

export function checkGstin(value: string): FieldCode | null {
	if (value === '') return null;
	if (value.length !== 15 || !GSTIN_PATTERN.test(value)) return 'invalid_gstin';
	const state = Number(value.slice(0, 2));
	return (state >= 1 && state <= 37) || state === 97 ? null : 'invalid_gstin';
}

export function checkPan(value: string): FieldCode | null {
	if (value === '') return null;
	if (value.length !== 10 || !PAN_PATTERN.test(value)) return 'invalid_pan';
	return PAN_ENTITY_TYPES.includes(value[3]) ? null : 'invalid_pan';
}

export function checkDrugLicence(value: string): FieldCode | null {
	if (value === '') return null;
	// ASCII only, so bytes === characters; the cap is on bytes
	if (bytes(value) < 8 || bytes(value) > 30) return 'invalid_drug_licence';
	if (!DRUG_LICENCE_CHARS.test(value)) return 'invalid_drug_licence';
	return /[A-Z]/.test(value) && /[0-9]/.test(value) ? null : 'invalid_drug_licence';
}

export function checkPhone(value: string): FieldCode | null {
	if (value === '') return null;
	return E164_PATTERN.test(value) ? null : 'invalid_phone';
}

/** The PAN inside a valid GSTIN is characters 3-12. */
const panInsideGstin = (gstin: string): string => gstin.slice(2, 12);

/** The code for the pair, or null. Checked only when both are present and each is valid by itself. */
export function checkGstinMatchesPan(gstin: string, pan: string): FieldCode | null {
	if (gstin === '' || pan === '' || checkGstin(gstin) || checkPan(pan)) return null;
	return panInsideGstin(gstin) === pan ? null : 'gstin_pan_mismatch';
}

export interface AddressParts {
	street: string;
	city: string;
	district: string;
	state: string;
	state_code: string;
	pincode: string;
}

/**
 * Per part, as Go: `address.street` ... The address is "not declared" when street, city and pincode are ALL blank (the
 * handler skips it); one of them filled makes street, city, state and pincode required.
 */
export function checkAddress(raw: AddressParts): Partial<Record<keyof AddressParts, FieldCode>> {
	const a = {
		street: raw.street.trim(),
		city: raw.city.trim(),
		district: raw.district.trim(),
		state: raw.state.trim(),
		state_code: raw.state_code.trim(),
		pincode: raw.pincode.trim()
	};
	if (a.street === '' && a.city === '' && a.pincode === '') return {};
	const out: Partial<Record<keyof AddressParts, FieldCode>> = {};
	const text = (part: 'street' | 'city' | 'state', max: number) => {
		if (a[part] === '') out[part] = 'required';
		else if (bytes(a[part]) > max) out[part] = 'too_long';
	};
	text('street', 200);
	text('city', 80);
	if (bytes(a.district) > 80) out.district = 'too_long';
	text('state', 80);
	if (bytes(a.state_code) > 4) out.state_code = 'too_long';
	if (a.pincode === '') out.pincode = 'required';
	else if (!PIN_PATTERN.test(a.pincode)) out.pincode = 'invalid_pincode';
	return out;
}

// ---- the one table of text formats: what a TextField with `format="..."` is -----------------------------------------

/** Text that is not prose: a mobile keyboard must not capitalise, correct or spell-check it. */
export type TextFormat = 'email' | 'phone' | 'pincode' | 'gstin' | 'pan' | 'code';

export interface TextFormatSpec {
	/** The input `type` (`email` and `tel` open the right keyboard and are what a password manager recognises). */
	readonly type: 'text' | 'email' | 'tel';
	readonly inputmode: 'text' | 'email' | 'tel' | 'numeric';
	/** `characters` makes the keyboard start in capitals (GSTIN, PAN); `none` keeps it lower-case. */
	readonly autocapitalize: 'none' | 'characters';
	readonly autocorrect: 'off';
	readonly spellcheck: false;
	/** The default `autocomplete` token, where one is right; a caller's own always wins (sign-in says `username`). */
	readonly autocomplete: string;
	/** Applied to the text when the field is left and when text is pasted, and written back into the input. */
	readonly tidy: (text: string) => string;
}

/** An address has no spaces, and no tab or line break: a paste with one at either end is the usual case. */
const tidyEmail = (text: string): string => text.trim();

/** A code (slug, a confirm phrase, a permission name): trimmed, otherwise exactly as typed. */
const tidyCode = (text: string): string => text.trim();

/**
 * Per format: the attributes the browser and keyboard need, and the tidy. `tidy` for GSTIN, PAN, phone and pincode is
 * the function the checks above assume (what is shown is what is sent); email and code only trim.
 */
export const TEXT_FORMATS: Readonly<Record<TextFormat, TextFormatSpec>> = {
	email: {
		type: 'email',
		inputmode: 'email',
		autocapitalize: 'none',
		autocorrect: 'off',
		spellcheck: false,
		autocomplete: 'email',
		tidy: tidyEmail
	},
	phone: {
		type: 'tel',
		inputmode: 'tel',
		autocapitalize: 'none',
		autocorrect: 'off',
		spellcheck: false,
		autocomplete: 'tel',
		tidy: tidyPhone
	},
	pincode: {
		type: 'text',
		inputmode: 'numeric',
		autocapitalize: 'none',
		autocorrect: 'off',
		spellcheck: false,
		autocomplete: 'postal-code',
		tidy: tidyPincode
	},
	gstin: {
		type: 'text',
		inputmode: 'text',
		autocapitalize: 'characters',
		autocorrect: 'off',
		spellcheck: false,
		autocomplete: 'off',
		tidy: tidyIdentifier
	},
	pan: {
		type: 'text',
		inputmode: 'text',
		autocapitalize: 'characters',
		autocorrect: 'off',
		spellcheck: false,
		autocomplete: 'off',
		tidy: tidyIdentifier
	},
	code: {
		type: 'text',
		inputmode: 'text',
		autocapitalize: 'none',
		autocorrect: 'off',
		spellcheck: false,
		autocomplete: 'off',
		tidy: tidyCode
	}
};
