export {
	DEFAULT_PREFERENCES,
	PREFERENCE_ATTRIBUTES,
	PREFERENCE_KEYS,
	PREFERENCE_VALUES,
	isPreferenceValue,
	preferencesSchema,
	type PreferenceKey,
	type Preferences
} from './schema';
export {
	PREFERENCES_COOKIE,
	PREFERENCES_COOKIE_MAX_AGE,
	decodePreferences,
	encodePreferences,
	htmlAttributes
} from './codec';
export { cookieStorage, noopStorage, type PreferencesStorage } from './storage';
export { createPreferences, type PreferencesStore } from './store.svelte';
export { getPreferences, setPreferences } from './context';
export { removeLegacyThemeKeys } from './legacy';
