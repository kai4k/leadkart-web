/**
 * Dark-mode store using Svelte 5 runes. Persists choice to localStorage
 * + reflects on <html class="dark"> so Tailwind's `dark:` variant
 * activates without a hydration flicker.
 *
 * Module-scoped state (not class-instance) — single global theme per
 * tab. Idiomatic Svelte 5: export `let`-style accessors backed by
 * `$state` + provide functions, not a constructor.
 */

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'leadkart-theme';

/**
 * Resolves the user's stored preference, falling back to the OS-level
 * `prefers-color-scheme`. Safe on the server (returns `'light'` since
 * `window` is undefined).
 */
function readInitial(): Theme {
	if (typeof window === 'undefined') return 'light';
	const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

let theme = $state<Theme>(readInitial());

/** Returns the active theme — 'light' | 'dark' | 'system' (the user's preference). */
export function getTheme(): Theme {
	return theme;
}

/** Resolves 'system' to the OS-level preference. */
export function effectiveTheme(): 'light' | 'dark' {
	if (theme === 'system') {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return theme;
}

/** Sets the theme + persists + reflects on <html>. */
export function setTheme(next: Theme) {
	theme = next;
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(STORAGE_KEY, next);
	applyToDocument();
}

/** Applies the effective theme as a class on <html>. */
export function applyToDocument() {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	if (effectiveTheme() === 'dark') root.classList.add('dark');
	else root.classList.remove('dark');
}

/** Toggles between light + dark (system → resolved opposite). */
export function toggleTheme() {
	setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
}
