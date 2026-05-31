/**
 * Theme store — Svelte 5 class-based reactive store for the trimmed
 * customiser surface: brand colour + content width. The semibox layout
 * is now the only chrome shape (forced via data-layout='semibox' on
 * <html> by the FOUC prime in app.html); the previous user-facing
 * toggles for layout, sidebar theme, and direction were removed
 * 2026-05-17 — no canonical SaaS dashboard (Linear, Vercel, Stripe
 * Dashboard, Notion, GitHub) exposes those as customer-facing knobs
 * either.
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

/** Content width — `default` caps page-inner at the 2xl container
 *  (96rem) so wide screens don't sprawl text across half a metre.
 *  `fluid` removes the cap. Slack / Notion / GitHub all ship this. */
export type ContentWidth = 'default' | 'fluid';

export const PRIMARY_COLORS: ReadonlyArray<{ id: PrimaryColor; label: string; hex: string }> = [
	{ id: 'navy', label: 'Brand', hex: '#502d81' },
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

export const CONTENT_WIDTHS: ReadonlyArray<{ id: ContentWidth; label: string }> = [
	{ id: 'default', label: 'Boxed' },
	{ id: 'fluid', label: 'Fluid' }
];

const STORAGE_KEYS = {
	primary: 'leadkart-primary',
	sidebarCollapsed: 'leadkart-sidebar-collapsed',
	contentWidth: 'leadkart-content-width'
} as const;

function readInitial<T extends string>(
	key: string,
	fallback: T,
	valid: ReadonlyArray<{ id: T }>
): T {
	if (typeof window === 'undefined') return fallback;
	const stored = window.localStorage.getItem(key);
	const found = valid.find((c) => c.id === stored);
	return found?.id ?? fallback;
}

function readBoolean(key: string, fallback: boolean): boolean {
	if (typeof window === 'undefined') return fallback;
	const stored = window.localStorage.getItem(key);
	if (stored === '1') return true;
	if (stored === '0') return false;
	return fallback;
}

function persist(key: string, value: string): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(key, value);
}

function setAttr(el: Element, name: string, value: string, defaultValue: string): void {
	if (value === defaultValue) el.removeAttribute(name);
	else el.setAttribute(name, value);
}

export interface Theme {
	readonly primary: PrimaryColor;
	readonly sidebarCollapsed: boolean;
	readonly contentWidth: ContentWidth;
	setPrimary(next: PrimaryColor): void;
	setSidebarCollapsed(next: boolean): void;
	toggleSidebarCollapsed(): void;
	setContentWidth(next: ContentWidth): void;
	reset(): void;
	applyToDocument(): void;
}

function createTheme(): Theme {
	let primary = $state<PrimaryColor>(
		readInitial<PrimaryColor>(STORAGE_KEYS.primary, 'navy', PRIMARY_COLORS)
	);
	let sidebarCollapsed = $state<boolean>(readBoolean(STORAGE_KEYS.sidebarCollapsed, false));
	let contentWidth = $state<ContentWidth>(
		readInitial<ContentWidth>(STORAGE_KEYS.contentWidth, 'default', CONTENT_WIDTHS)
	);

	/**
	 * Reflects state on <html>:
	 *   data-primary           — colour token override
	 *   data-content-width     — boxed | fluid page-inner cap
	 *   data-sidebar-collapsed — boolean attribute, sidebar width
	 *
	 * data-layout='semibox' is set unconditionally by the FOUC prime
	 * in app.html and never touched at runtime — semibox is the only
	 * supported chrome shape.
	 */
	function applyToDocument(): void {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		setAttr(root, 'data-primary', primary, 'navy');
		setAttr(root, 'data-content-width', contentWidth, 'default');
		if (sidebarCollapsed) root.setAttribute('data-sidebar-collapsed', '');
		else root.removeAttribute('data-sidebar-collapsed');
	}

	function setPrimary(next: PrimaryColor): void {
		primary = next;
		persist(STORAGE_KEYS.primary, next);
		applyToDocument();
	}

	function setSidebarCollapsed(next: boolean): void {
		sidebarCollapsed = next;
		persist(STORAGE_KEYS.sidebarCollapsed, next ? '1' : '0');
		applyToDocument();
	}

	function setContentWidth(next: ContentWidth): void {
		contentWidth = next;
		persist(STORAGE_KEYS.contentWidth, next);
		applyToDocument();
	}

	return {
		get primary() {
			return primary;
		},
		get sidebarCollapsed() {
			return sidebarCollapsed;
		},
		get contentWidth() {
			return contentWidth;
		},
		setPrimary,
		setSidebarCollapsed,
		toggleSidebarCollapsed() {
			setSidebarCollapsed(!sidebarCollapsed);
		},
		setContentWidth,
		reset() {
			setPrimary('navy');
			setSidebarCollapsed(false);
			setContentWidth('default');
		},
		applyToDocument
	};
}

/**
 * Module-level singleton — the theme store is intentionally shared
 * across every component (FOUC prime in app.html, Topbar toggle,
 * Sidebar collapse). Singleton-via-module-export is the Svelte canon
 * for this kind of root-scope reactive state (Stripe Dashboard, Linear,
 * Vercel all ship the same pattern).
 *
 * The "module-level $state" ban in CLAUDE.md rule 4 targets bare
 * `let foo = $state(...)` at module scope, which silently breaks
 * reactivity across module boundaries. `createTheme()` returns a fresh
 * closure with proxied state — the singleton instance below is safe
 * because the proxy lives inside the closure, not at module scope.
 */
export const theme = createTheme();
