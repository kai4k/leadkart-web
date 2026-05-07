/**
 * Dark-mode store — Svelte 5 class-based reactive store.
 *
 * Industry canon: Svelte 5 stores live as class instances with `$state`
 * fields, NOT module-level `let foo = $state(...)` + function accessors.
 * The class pattern guarantees reactivity across module boundaries —
 * components reading `theme.effective` get re-rendered when `current`
 * mutates. The function-accessor pattern silently breaks reactivity
 * (Joy of Code "Stores in Svelte 5"; Svelte 5 official docs
 * "Universal reactivity"; Rich Harris Svelte Summit 2024 talk).
 *
 * The single shared instance is exported as `theme`. Components import
 * + use directly:
 *
 *   import { theme } from '$lib/stores/theme.svelte';
 *   <button onclick={() => theme.toggle()}>{theme.effective}</button>
 */

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'leadkart-theme';

class ThemeStore {
	current = $state<Theme>(this.readInitial());

	private readInitial(): Theme {
		if (typeof window === 'undefined') return 'system';
		const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
		if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
		return 'system';
	}

	/**
	 * Resolves 'system' to the OS-level preference. Reactive — `$derived`-
	 * style getter; reading from a template / `$derived` expression in a
	 * component triggers re-render when `current` changes.
	 */
	get effective(): 'light' | 'dark' {
		if (this.current === 'system') {
			if (typeof window === 'undefined') return 'light';
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return this.current;
	}

	/** Sets the theme + persists + reflects on <html>. */
	set(next: Theme) {
		this.current = next;
		this.persist(next);
		this.applyToDocument();
	}

	/** Toggles between light + dark (system → resolved opposite). */
	toggle() {
		this.set(this.effective === 'dark' ? 'light' : 'dark');
	}

	/**
	 * Reflects the effective theme as a class on <html>. Idempotent.
	 * Called automatically by `set` + `toggle`; the root +layout calls
	 * it inside `$effect` so external `current` mutations also flow.
	 */
	applyToDocument() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (this.effective === 'dark') root.classList.add('dark');
		else root.classList.remove('dark');
	}

	private persist(value: Theme) {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(STORAGE_KEY, value);
	}
}

export const theme = new ThemeStore();
