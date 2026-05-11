/**
 * Theme store — Svelte 5 class-based reactive store managing the full
 * customiser state (modelled on Domiex SettingsModal, sans dark mode):
 *
 *   - primary       (one of 11 brand-stop choices)
 *   - layoutMode    ('default' | 'horizontal' | 'modern' | 'boxed' | 'semibox')
 *   - sidebarSize   ('default' | 'medium' | 'small')
 *   - sidebarColor  ('light' | 'dark' | 'brand' | 'purple' | 'sky')
 *   - contentWidth  ('default' | 'fluid')
 *   - layoutDir     ('ltr' | 'rtl')
 *
 * Dark mode removed 2026-05-12. All state is applied to `<html>` via
 * data attributes (data-primary, data-layout, data-sidebar-size,
 * data-sidebar-colors, data-content-width) + `dir` attribute. The CSS
 * in base.css consumes these. Default values use no attribute so base
 * tokens / layout rules win without override noise.
 *
 * Industry canon: Svelte 5 stores are class instances with `$state`
 * fields, NOT module-level `let foo = $state(...)` + function
 * accessors. Class pattern guarantees reactivity across module
 * boundaries.
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

export type LayoutMode = 'default' | 'horizontal' | 'modern' | 'boxed' | 'semibox';
export type SidebarSize = 'default' | 'medium' | 'small';
export type SidebarColor = 'light' | 'dark' | 'brand' | 'purple' | 'sky';
export type ContentWidth = 'default' | 'fluid';
export type LayoutDir = 'ltr' | 'rtl';

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

export const LAYOUT_MODES: ReadonlyArray<{ id: LayoutMode; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'horizontal', label: 'Horizontal' },
	{ id: 'modern', label: 'Modern' },
	{ id: 'boxed', label: 'Boxed' },
	{ id: 'semibox', label: 'Semibox' }
];

export const SIDEBAR_SIZES: ReadonlyArray<{ id: SidebarSize; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'medium', label: 'Medium' },
	{ id: 'small', label: 'Small' }
];

export const SIDEBAR_COLORS: ReadonlyArray<{ id: SidebarColor; label: string; swatch: string }> = [
	{ id: 'light', label: 'Light', swatch: 'oklch(0.97 0.005 245)' },
	{ id: 'dark', label: 'Dark', swatch: 'oklch(0.25 0.02 256)' },
	{ id: 'brand', label: 'Brand', swatch: 'var(--color-brand-700)' },
	{ id: 'purple', label: 'Purple', swatch: 'oklch(0.32 0.12 305)' },
	{ id: 'sky', label: 'Sky', swatch: 'oklch(0.42 0.1 230)' }
];

export const CONTENT_WIDTHS: ReadonlyArray<{ id: ContentWidth; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'fluid', label: 'Fluid' }
];

export const LAYOUT_DIRS: ReadonlyArray<{ id: LayoutDir; label: string }> = [
	{ id: 'ltr', label: 'LTR' },
	{ id: 'rtl', label: 'RTL' }
];

const STORAGE_KEYS = {
	primary: 'leadkart-primary',
	layoutMode: 'leadkart-layout-mode',
	sidebarSize: 'leadkart-sidebar-size',
	sidebarColor: 'leadkart-sidebar-color',
	contentWidth: 'leadkart-content-width',
	layoutDir: 'leadkart-layout-dir'
} as const;

class ThemeStore {
	primary = $state<PrimaryColor>(
		this.readInitial<PrimaryColor>(STORAGE_KEYS.primary, 'navy', PRIMARY_COLORS)
	);
	layoutMode = $state<LayoutMode>(
		this.readInitial<LayoutMode>(STORAGE_KEYS.layoutMode, 'default', LAYOUT_MODES)
	);
	sidebarSize = $state<SidebarSize>(
		this.readInitial<SidebarSize>(STORAGE_KEYS.sidebarSize, 'default', SIDEBAR_SIZES)
	);
	sidebarColor = $state<SidebarColor>(
		this.readInitial<SidebarColor>(STORAGE_KEYS.sidebarColor, 'light', SIDEBAR_COLORS)
	);
	contentWidth = $state<ContentWidth>(
		this.readInitial<ContentWidth>(STORAGE_KEYS.contentWidth, 'default', CONTENT_WIDTHS)
	);
	layoutDir = $state<LayoutDir>(
		this.readInitial<LayoutDir>(STORAGE_KEYS.layoutDir, 'ltr', LAYOUT_DIRS)
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
		this.persist(STORAGE_KEYS.primary, next);
		this.applyToDocument();
	}
	setLayoutMode(next: LayoutMode) {
		this.layoutMode = next;
		this.persist(STORAGE_KEYS.layoutMode, next);
		this.applyToDocument();
	}
	setSidebarSize(next: SidebarSize) {
		this.sidebarSize = next;
		this.persist(STORAGE_KEYS.sidebarSize, next);
		this.applyToDocument();
	}
	setSidebarColor(next: SidebarColor) {
		this.sidebarColor = next;
		this.persist(STORAGE_KEYS.sidebarColor, next);
		this.applyToDocument();
	}
	setContentWidth(next: ContentWidth) {
		this.contentWidth = next;
		this.persist(STORAGE_KEYS.contentWidth, next);
		this.applyToDocument();
	}
	setLayoutDir(next: LayoutDir) {
		this.layoutDir = next;
		this.persist(STORAGE_KEYS.layoutDir, next);
		this.applyToDocument();
	}

	reset() {
		this.setPrimary('navy');
		this.setLayoutMode('default');
		this.setSidebarSize('default');
		this.setSidebarColor('light');
		this.setContentWidth('default');
		this.setLayoutDir('ltr');
	}

	/**
	 * Reflects all customiser state on <html> via data attributes
	 * + dir attribute. Idempotent. Default values use no attribute so
	 * base tokens win without override noise. Called by every setter
	 * + the root +layout's `$effect`.
	 */
	applyToDocument() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		// Strip the legacy `.dark` class if persisted from the prior
		// theme system — keeps existing user sessions clean.
		root.classList.remove('dark');

		this.setAttr(root, 'data-primary', this.primary, 'navy');
		this.setAttr(root, 'data-layout', this.layoutMode, 'default');
		this.setAttr(root, 'data-sidebar-size', this.sidebarSize, 'default');
		this.setAttr(root, 'data-sidebar-colors', this.sidebarColor, 'light');
		this.setAttr(root, 'data-content-width', this.contentWidth, 'default');

		// `dir` is a native HTML attribute (not data-*); set even on
		// default ltr for explicitness (some browsers default to auto).
		root.setAttribute('dir', this.layoutDir);
	}

	private setAttr(el: Element, name: string, value: string, defaultValue: string) {
		if (value === defaultValue) el.removeAttribute(name);
		else el.setAttribute(name, value);
	}

	private persist(key: string, value: string) {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(key, value);
	}
}

export const theme = new ThemeStore();
