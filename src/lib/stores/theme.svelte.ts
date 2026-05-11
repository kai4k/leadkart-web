/**
 * Theme store — Svelte 5 class-based reactive store managing the
 * customiser state:
 *   - primary       (one of 11 brand-stop choices)
 *   - sidebarSize   ('default' | 'compact')
 *   - contentWidth  ('default' | 'fluid')
 *
 * Dark mode removed 2026-05-12. LeadKart's auth + (app) surfaces are
 * intentionally light-only — pharma B2B canon, no light/dark toggle.
 * The customiser exposes colour + layout-style options instead.
 *
 * Industry canon: Svelte 5 stores are class instances with `$state`
 * fields, NOT module-level `let foo = $state(...)` + function
 * accessors. Class pattern guarantees reactivity across module
 * boundaries.
 *
 * All state is applied to `<html>` via data attributes
 * (`data-primary`, `data-sidebar-size`, `data-content-width`) that
 * the CSS in base.css consumes. Default values use no attribute so
 * the base tokens / layout rules win without override noise.
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

export type SidebarSize = 'default' | 'compact';
export type ContentWidth = 'default' | 'fluid';

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

export const SIDEBAR_SIZES: ReadonlyArray<{ id: SidebarSize; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'compact', label: 'Compact' }
];

export const CONTENT_WIDTHS: ReadonlyArray<{ id: ContentWidth; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'fluid', label: 'Fluid' }
];

const PRIMARY_KEY = 'leadkart-primary';
const SIDEBAR_SIZE_KEY = 'leadkart-sidebar-size';
const CONTENT_WIDTH_KEY = 'leadkart-content-width';

class ThemeStore {
	primary = $state<PrimaryColor>(
		this.readInitial<PrimaryColor>(PRIMARY_KEY, 'navy', PRIMARY_COLORS)
	);
	sidebarSize = $state<SidebarSize>(
		this.readInitial<SidebarSize>(SIDEBAR_SIZE_KEY, 'default', SIDEBAR_SIZES)
	);
	contentWidth = $state<ContentWidth>(
		this.readInitial<ContentWidth>(CONTENT_WIDTH_KEY, 'default', CONTENT_WIDTHS)
	);

	private readInitial<T extends string>(
		key: string,
		fallback: T,
		valid: ReadonlyArray<{ id: T }>
	): T {
		if (typeof window === 'undefined') return fallback;
		const stored = window.localStorage.getItem(key);
		const found = valid.find((c) => c.id === stored);
		return found?.id ?? fallback;
	}

	setPrimary(next: PrimaryColor) {
		this.primary = next;
		this.persist(PRIMARY_KEY, next);
		this.applyToDocument();
	}

	setSidebarSize(next: SidebarSize) {
		this.sidebarSize = next;
		this.persist(SIDEBAR_SIZE_KEY, next);
		this.applyToDocument();
	}

	setContentWidth(next: ContentWidth) {
		this.contentWidth = next;
		this.persist(CONTENT_WIDTH_KEY, next);
		this.applyToDocument();
	}

	/** Resets all customiser settings to default. */
	reset() {
		this.setPrimary('navy');
		this.setSidebarSize('default');
		this.setContentWidth('default');
	}

	/**
	 * Reflects customiser state on the root <html> via data attributes.
	 * Idempotent. Default values use no attribute so base tokens win
	 * without override noise. Called by setters + the root +layout's
	 * `$effect`.
	 */
	applyToDocument() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		// Strip the legacy `.dark` class if persisted from the prior
		// theme system — keeps existing user sessions clean post-upgrade.
		root.classList.remove('dark');

		if (this.primary === 'navy') root.removeAttribute('data-primary');
		else root.setAttribute('data-primary', this.primary);

		if (this.sidebarSize === 'default') root.removeAttribute('data-sidebar-size');
		else root.setAttribute('data-sidebar-size', this.sidebarSize);

		if (this.contentWidth === 'default') root.removeAttribute('data-content-width');
		else root.setAttribute('data-content-width', this.contentWidth);
	}

	private persist(key: string, value: string) {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(key, value);
	}
}

export const theme = new ThemeStore();
