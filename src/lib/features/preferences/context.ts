import { createContext } from 'svelte';
import type { PreferencesStore } from './store.svelte';

/** Set once in the root layout; read anywhere below it. Never a module singleton (SSR is per request). */
export const [getPreferences, setPreferences] = createContext<PreferencesStore>();
