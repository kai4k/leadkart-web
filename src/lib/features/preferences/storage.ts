import {
	decodePreferences,
	encodePreferences,
	PREFERENCES_COOKIE,
	PREFERENCES_COOKIE_MAX_AGE
} from './codec';
import { DEFAULT_PREFERENCES, type Preferences } from './schema';

export interface PreferencesStorage {
	read(): Preferences;
	write(p: Preferences): void;
}

/** The `lk_ui` cookie: device presentation only, readable by the server on the next request. */
export function cookieStorage(doc: Document = document): PreferencesStorage {
	return {
		read() {
			try {
				const prefix = `${PREFERENCES_COOKIE}=`;
				for (const part of doc.cookie.split(';')) {
					const trimmed = part.trim();
					if (trimmed.startsWith(prefix)) return decodePreferences(trimmed.slice(prefix.length));
				}
			} catch {
				/* cookies blocked: defaults */
			}
			return { ...DEFAULT_PREFERENCES };
		},
		write(p) {
			try {
				const secure = doc.defaultView?.location.protocol === 'https:' ? '; Secure' : '';
				doc.cookie =
					`${PREFERENCES_COOKIE}=${encodePreferences(p)}; Path=/; ` +
					`Max-Age=${PREFERENCES_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
			} catch {
				/* cookies blocked: the change still applies for this page */
			}
		}
	};
}

/** Server-side and test storage that persists nothing. */
export const noopStorage: PreferencesStorage = {
	read: () => ({ ...DEFAULT_PREFERENCES }),
	write: () => {}
};
