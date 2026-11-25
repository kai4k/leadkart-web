import {
	DEFAULT_PREFERENCES,
	PREFERENCE_ATTRIBUTES,
	PREFERENCE_KEYS,
	preferencesSchema,
	type Preferences
} from './schema';

export const PREFERENCES_COOKIE = 'lk_ui';
export const PREFERENCES_COOKIE_MAX_AGE = 31_536_000;

/**
 * The cookie is attacker-controllable text. It is length-capped BEFORE anything decodes it (a real
 * value is about 230 characters), and only ever feeds a presentation-only enum.
 */
const MAX_RAW_LENGTH = 400;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Bump when an axis or value is removed or renamed: any other version decodes to defaults. */
export const PREFERENCES_COOKIE_VERSION = 2;

/** base64url(JSON.stringify({ v, ...p })): ASCII only, so btoa needs no byte conversion. */
export function encodePreferences(p: Preferences): string {
	return btoa(JSON.stringify({ v: PREFERENCES_COOKIE_VERSION, ...p }))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
}

/** Never throws. Bad input gives the defaults; a bad field gives that field's default. */
export function decodePreferences(raw: string | null | undefined): Preferences {
	if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RAW_LENGTH) {
		return { ...DEFAULT_PREFERENCES };
	}
	// Length is bounded above, so this anchored test cannot be driven into heavy work.
	if (!BASE64URL.test(raw)) return { ...DEFAULT_PREFERENCES };
	try {
		const b64 = raw.replaceAll('-', '+').replaceAll('_', '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const payload: unknown = JSON.parse(atob(padded));
		if ((payload as { v?: unknown } | null)?.v !== PREFERENCES_COOKIE_VERSION) {
			return { ...DEFAULT_PREFERENCES };
		}
		return preferencesSchema.parse(payload);
	} catch {
		return { ...DEFAULT_PREFERENCES };
	}
}

/** The `data-*` pairs in schema order. Every value comes from the enum, never from input. */
export function htmlAttributes(p: Preferences): string {
	return PREFERENCE_KEYS.map((key) => `${PREFERENCE_ATTRIBUTES[key]}="${p[key]}"`).join(' ');
}
