/**
 * Theme store — Svelte 5 class-based reactive store managing the
 * customiser state for LeadKart's Linear/Vercel-style shell:
 *
 *   - primary           (one of 11 brand-stop choices)
 *   - sidebarColor      ('light' | 'dark') — preference / accessibility
 *   - layoutDir         ('ltr' | 'rtl')    — i18n
 *   - sidebarCollapsed  (boolean)          — desktop hamburger state
 *
 * All other axes (layoutMode, sidebarSize, navType, contentWidth) were
 * removed 2026-05-13 — no professional SaaS dashboard (Linear, Vercel,
 * Stripe Dashboard, Notion, GitHub) ships those as user-facing toggles.
 * They were a Domiex theme-marketplace demo feature.
 *
 * Industry canon: Svelte 5 stores are class instances with `$state`
 * fields, NOT module-level `let foo = $state(...)` + function accessors.
 * Class pattern guarantees reactivity across module boundaries.
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

export type SidebarColor = 'light' | 'dark';
export type LayoutDir = 'ltr' | 'rtl';
/** Content width — `default` caps page-inner at the 2xl container
 *  (96rem) so wide screens don't sprawl text across half a metre.
 *  `fluid` removes the cap. Slack / Notion / GitHub all ship this. */
export type ContentWidth = 'default' | 'fluid';
/** Layout mode — binary toggle. `default` is the flat Linear/Vercel
 *  shell; `semibox` is Domiex's floating-pane variant (0.75rem gap
 *  around the topbar + sidebar + content, each with a 1px border + 6px
 *  radius — the topbar starts after the sidebar horizontally). */
export type LayoutMode = 'default' | 'semibox';

export const PRIMARY_COLORS: ReadonlyArray<{ id: PrimaryColor; label: string; hex: string }> = [
	{ id: 'navy', label: 'Navy', hex: '#2D2F7E' },
	{ id: 'blue', label: 'Blue', hex: '#265A8E' },
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

export const SIDEBAR_COLORS: ReadonlyArray<{ id: SidebarColor; label: string; swatch: string }> = [
	{ id: 'light', label: 'Light', swatch: 'oklch(0.98 0.005 245)' },
	{ id: 'dark', label: 'Dark', swatch: 'oklch(0.25 0.02 256)' }
];

export const LAYOUT_DIRS: ReadonlyArray<{ id: LayoutDir; label: string }> = [
	{ id: 'ltr', label: 'LTR' },
	{ id: 'rtl', label: 'RTL' }
];

export const LAYOUT_MODES: ReadonlyArray<{ id: LayoutMode; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'semibox', label: 'Semibox' }
];

export const CONTENT_WIDTHS: ReadonlyArray<{ id: ContentWidth; label: string }> = [
	{ id: 'default', label: 'Default' },
	{ id: 'fluid', label: 'Fluid' }
];

const STORAGE_KEYS = {
	primary: 'leadkart-primary',
	sidebarColor: 'leadkart-sidebar-color',
	layoutDir: 'leadkart-layout-dir',
	sidebarCollapsed: 'leadkart-sidebar-collapsed',
	layoutMode: 'leadkart-layout-mode',
	contentWidth: 'leadkart-content-width'
} as const;

class ThemeStore {
	primary = $state<PrimaryColor>(
		this.readInitial<PrimaryColor>(STORAGE_KEYS.primary, 'navy', PRIMARY_COLORS)
	);
	sidebarColor = $state<SidebarColor>(
		this.readInitial<SidebarColor>(STORAGE_KEYS.sidebarColor, 'light', SIDEBAR_COLORS)
	);
	layoutDir = $state<LayoutDir>(
		this.readInitial<LayoutDir>(STORAGE_KEYS.layoutDir, 'ltr', LAYOUT_DIRS)
	);
	sidebarCollapsed = $state<boolean>(this.readBoolean(STORAGE_KEYS.sidebarCollapsed, false));
	layoutMode = $state<LayoutMode>(
		this.readInitial<LayoutMode>(STORAGE_KEYS.layoutMode, 'default', LAYOUT_MODES)
	);
	contentWidth = $state<ContentWidth>(
		this.readInitial<ContentWidth>(STORAGE_KEYS.contentWidth, 'default', CONTENT_WIDTHS)
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

	private readBoolean(key: string, fallback: boolean): boolean {
		if (typeof window === 'undefined') return fallback;
		const stored = window.localStorage.getItem(key);
		if (stored === '1') return true;
		if (stored === '0') return false;
		return fallback;
	}

	setPrimary(next: PrimaryColor) {
		this.primary = next;
		this.persist(STORAGE_KEYS.primary, next);
		this.applyToDocument();
	}
	setSidebarColor(next: SidebarColor) {
		this.sidebarColor = next;
		this.persist(STORAGE_KEYS.sidebarColor, next);
		this.applyToDocument();
	}
	setLayoutDir(next: LayoutDir) {
		this.layoutDir = next;
		this.persist(STORAGE_KEYS.layoutDir, next);
		this.applyToDocument();
	}
	toggleSidebarCollapsed() {
		this.setSidebarCollapsed(!this.sidebarCollapsed);
	}
	setSidebarCollapsed(next: boolean) {
		this.sidebarCollapsed = next;
		this.persist(STORAGE_KEYS.sidebarCollapsed, next ? '1' : '0');
		this.applyToDocument();
	}
	setLayoutMode(next: LayoutMode) {
		this.layoutMode = next;
		this.persist(STORAGE_KEYS.layoutMode, next);
		this.applyToDocument();
	}
	setContentWidth(next: ContentWidth) {
		this.contentWidth = next;
		this.persist(STORAGE_KEYS.contentWidth, next);
		this.applyToDocument();
	}

	reset() {
		this.setPrimary('navy');
		this.setSidebarColor('light');
		this.setLayoutDir('ltr');
		this.setSidebarCollapsed(false);
		this.setLayoutMode('default');
		this.setContentWidth('default');
	}

	/**
	 * Reflects state on <html>:
	 *   data-primary         — colour token override
	 *   data-sidebar-colors  — light/dark sidebar surface
	 *   data-sidebar-collapsed (boolean attribute) — sidebar width
	 *   dir                  — native LTR/RTL
	 */
	applyToDocument() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		root.classList.remove('dark');

		this.setAttr(root, 'data-primary', this.primary, 'navy');
		this.setAttr(root, 'data-sidebar-colors', this.sidebarColor, 'light');
		this.setAttr(root, 'data-layout', this.layoutMode, 'default');
		this.setAttr(root, 'data-content-width', this.contentWidth, 'default');

		if (this.sidebarCollapsed) root.setAttribute('data-sidebar-collapsed', '');
		else root.removeAttribute('data-sidebar-collapsed');

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
