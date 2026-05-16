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

class ThemeStore {
	primary = $state<PrimaryColor>(
		this.readInitial<PrimaryColor>(STORAGE_KEYS.primary, 'navy', PRIMARY_COLORS)
	);
	sidebarCollapsed = $state<boolean>(this.readBoolean(STORAGE_KEYS.sidebarCollapsed, false));
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
	toggleSidebarCollapsed() {
		this.setSidebarCollapsed(!this.sidebarCollapsed);
	}
	setSidebarCollapsed(next: boolean) {
		this.sidebarCollapsed = next;
		this.persist(STORAGE_KEYS.sidebarCollapsed, next ? '1' : '0');
		this.applyToDocument();
	}
	setContentWidth(next: ContentWidth) {
		this.contentWidth = next;
		this.persist(STORAGE_KEYS.contentWidth, next);
		this.applyToDocument();
	}

	reset() {
		this.setPrimary('navy');
		this.setSidebarCollapsed(false);
		this.setContentWidth('default');
	}

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
	applyToDocument() {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;

		this.setAttr(root, 'data-primary', this.primary, 'navy');
		this.setAttr(root, 'data-content-width', this.contentWidth, 'default');

		if (this.sidebarCollapsed) root.setAttribute('data-sidebar-collapsed', '');
		else root.removeAttribute('data-sidebar-collapsed');
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
