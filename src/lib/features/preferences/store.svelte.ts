import {
	DEFAULT_PREFERENCES,
	isPreferenceValue,
	PREFERENCE_ATTRIBUTES,
	PREFERENCE_KEYS,
	type Preferences
} from './schema';
import { cookieStorage, noopStorage, type PreferencesStorage } from './storage';

export interface PreferencesStore extends Readonly<Preferences> {
	readonly all: Preferences;
	/** Validates each key against the enum, then updates state, storage and the `<html>` attributes. */
	set(patch: Partial<Preferences>): void;
	reset(): void;
}

/**
 * Per-request state: create one in the root layout and put it in context (`setPreferences`).
 * A module-level instance would be shared by every request the Node server renders.
 */
export function createPreferences(
	initial: Preferences,
	storage: PreferencesStorage = typeof document === 'undefined' ? noopStorage : cookieStorage(),
	root: () => HTMLElement | null = () =>
		typeof document === 'undefined' ? null : document.documentElement
): PreferencesStore {
	let state = $state<Preferences>({ ...DEFAULT_PREFERENCES, ...initial });

	function reflect(): void {
		const el = root();
		if (!el) return;
		for (const key of PREFERENCE_KEYS) el.setAttribute(PREFERENCE_ATTRIBUTES[key], state[key]);
	}

	function apply(next: Preferences): void {
		state = next;
		storage.write({ ...next });
		reflect();
	}

	const store = {
		get all() {
			return { ...state };
		},
		set(patch: Partial<Preferences>) {
			const next: Preferences = { ...state };
			let changed = false;
			for (const key of PREFERENCE_KEYS) {
				const value = patch[key];
				if (value !== undefined && isPreferenceValue(key, value) && value !== next[key]) {
					(next as Record<string, string>)[key] = value;
					changed = true;
				}
			}
			if (changed) apply(next);
		},
		reset() {
			apply({ ...DEFAULT_PREFERENCES });
		}
	} as PreferencesStore;

	for (const key of PREFERENCE_KEYS) {
		Object.defineProperty(store, key, { get: () => state[key], enumerable: true });
	}
	return store;
}
