/**
 * Theme store — Svelte 5 class-based reactive store managing light/
 * dark/system mode + the multi-primary colour picker (10 hue
 * choices ported from the Blazor LeadKart.Web theme customiser
 * per ThemeSettings.cs `PrimaryColors` array).
 *
 * Industry canon: Svelte 5 stores live as class instances with
 * `$state` fields, NOT module-level `let foo = $state(...)` +
 * function accessors. Class pattern guarantees reactivity across
 * module boundaries — components reading `theme.effective` get
 * re-rendered when `current` mutates. (Joy of Code "Stores in
 * Svelte 5"; Svelte 5 official docs "Universal reactivity"; Rich
 * Harris Svelte Summit 2024 talk.)
 */

type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Primary colour identifiers — extends the Blazor catalog with `'navy'`
 * (the new LeadKart navy-violet brand, derived from the logo wordmark).
 *
 * `'navy'` is the DEFAULT — leaving the picker untouched yields the
 * brand 11-stop scale baked into tokens.css (no `data-primary` attr).
 *
 * The other 10 entries are alt accents users can pick via the customiser
 * (drawer UI deferred); each maps to a `:root[data-primary='X']` override
 * block in styles/base.css that re-skins the brand 11-stop. Picker
 * `'blue'` = the previous corporate blue (#265A8E) for users who want
 * the old look back; `'green'` = iOS pure green (note: distinct from our
 * --color-secondary-* logo green which always stays).
 */
export type PrimaryColor =
	| 'navy'
	| 'blue'
	| 'green'
	| 'indigo'
	| 'orange'
	| 'teal'
	| 'purple'
	| 'pink'
	| 'red'
	| 'mint'
	| 'cyan';

export const PRIMARY_COLORS: ReadonlyArray<{ id: PrimaryColor; label: string; hex: string }> = [
	{ id: 'navy', label: 'Navy', hex: '#2D2F7E' }, // default — logo wordmark navy-violet
	{ id: 'blue', label: 'Blue', hex: '#265A8E' }, // legacy corporate blue
	{ id: 'green', label: 'Green', hex: '#34C759' },
	{ id: 'indigo', label: 'Indigo', hex: '#5856D6' },
	{ id: 'orange', label: 'Orange', hex: '#FF9500' },
	{ id: 'teal', label: 'Teal', hex: '#5AC8FA' },
	{ id: 'purple', label: 'Purple', hex: '#AF52DE' },
	{ id: 'pink', label: 'Pink', hex: '#FF2D55' },
	{ id: 'red', label: 'Red', hex: '#FF3B30' },
	{ id: 'mint', label: 'Mint', hex: '#00C7BE' },
	{ id: 'cyan', label: 'Cyan', hex: '#32ADE6' }
];

const STORAGE_KEY = 'leadkart-theme';
const PRIMARY_KEY = 'leadkart-primary';

class ThemeStore {
	current = $state<ThemeMode>(this.readInitialMode());
	primary = $state<PrimaryColor>(this.readInitialPrimary());

	private readInitialMode(): ThemeMode {
		if (typeof window === 'undefined') return 'system';
		const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
		if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
		return 'system';
	}

	private readInitialPrimary(): PrimaryColor {
		if (typeof window === 'undefined') return 'navy';
		const stored = window.localStorage.getItem(PRIMARY_KEY);
		const valid = PRIMARY_COLORS.find((c) => c.id === stored);
		return valid?.id ?? 'navy';
	}

	/**
	 * Resolves 'system' to the OS-level preference. Reactive — a
	 * `$derived` that reads this getter re-runs when `current` flips.
	 */
	get effective(): 'light' | 'dark' {
		if (this.current === 'system') {
			if (typeof window === 'undefined') return 'light';
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return this.current;
	}

	/** Sets light/dark/system mode + persists + reflects on <html>. */
	set(next: ThemeMode) {
		this.current = next;
		this.persist(STORAGE_KEY, next);
		this.applyToDocument();
	}

	/** Toggles between light + dark (system → resolved opposite). */
	toggle() {
		this.set(this.effective === 'dark' ? 'light' : 'dark');
	}

	/** Picks a primary colour + persists + reflects via data attr. */
	setPrimary(next: PrimaryColor) {
		this.primary = next;
		this.persist(PRIMARY_KEY, next);
		this.applyToDocument();
	}

	/**
	 * Reflects the effective theme (`<html class="dark">`) AND the
	 * primary colour (`<html data-primary="X">`) on the root element.
	 * Idempotent. Called by `set` / `setPrimary` / `toggle`; the root
	 * +layout calls it inside `$effect` so external state mutations
	 * also propagate to the DOM.
	 */
	applyToDocument() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (this.effective === 'dark') root.classList.add('dark');
		else root.classList.remove('dark');
		// Default primary ('navy') doesn't need an attribute — base
		// tokens.css already encodes the navy-violet logo brand. Other
		// primaries set data-primary so the override CSS rules in
		// base.css activate (re-skinning the brand 11-stop only;
		// secondary/semantic palettes stay constant).
		if (this.primary === 'navy') root.removeAttribute('data-primary');
		else root.setAttribute('data-primary', this.primary);
	}

	private persist(key: string, value: string) {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(key, value);
	}
}

export const theme = new ThemeStore();
