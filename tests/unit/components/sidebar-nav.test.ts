/**
 * The sidebar on the shadcn sidebar block: built from the one nav config (filtered by capabilities
 * and tenant context), `aria-current="page"` on the active entry, a localised `<nav>` landmark, an
 * icon-only collapsed size that still exposes every name, and a sheet below `lg` that follows the
 * breakpoint.
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../helpers/match-media.ts';
import {
	NEW_TENANT_ADMIN,
	OPERATOR_PLATFORM_ADMIN,
	SALES_EXECUTIVE
} from '../../support/go-personas.ts';
import type { Capabilities } from '#lib/features/auth/capabilities.ts';
import type { Preferences } from '#lib/features/preferences/index.ts';

const pageUrl = vi.hoisted(() => ({ value: new URL('http://localhost/settings/users') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return pageUrl.value;
		}
	}
}));
const sessionState = vi.hoisted(() => ({
	capabilities: null as unknown,
	inTenantContext: false
}));
vi.mock('#lib/features/auth/index.ts', () => ({ session: sessionState }));

import SidebarHost from '../stubs/SidebarHost.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let media: ReturnType<typeof installMatchMedia>;

async function render(
	prefs: Partial<Preferences>,
	caps: Capabilities = NEW_TENANT_ADMIN,
	inTenantContext = false
) {
	sessionState.capabilities = caps;
	sessionState.inTenantContext = inTenantContext;
	component = mount(SidebarHost, { target, props: { prefs } });
	flushSync();
	await tick();
}

const hrefs = () => [...document.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));

beforeEach(() => {
	media = installMatchMedia(1280);
	pageUrl.value = new URL('http://localhost/settings/users');
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

describe('the sidebar (desktop)', () => {
	it('is one localised "Main navigation" landmark', async () => {
		await render({});
		const navs = document.querySelectorAll('nav');
		expect(navs).toHaveLength(1);
		expect(navs[0]!.getAttribute('aria-label')).toBe('Main navigation');
	});

	it('marks the active entry aria-current="page" and no other', async () => {
		await render({});
		const current = [...document.querySelectorAll('[aria-current]')];
		expect(current).toHaveLength(1);
		expect(current[0]!.textContent).toContain('Team');
		expect(current[0]!.getAttribute('aria-current')).toBe('page');
		expect(current[0]!.getAttribute('href')).toBe('/settings/users');
	});

	it('follows the route: a child path keeps its parent active', async () => {
		pageUrl.value = new URL('http://localhost/settings/users/abc');
		await render({});
		expect(document.querySelector('[aria-current="page"]')?.textContent).toContain('Team');
	});

	it('renders the section labels and the entries the caller may open', async () => {
		await render({});
		const labels = [...document.querySelectorAll('[data-slot="sidebar-group-label"]')].map((e) =>
			e.textContent?.trim()
		);
		expect(labels).toContain('Administration');
		expect(hrefs()).toEqual(
			expect.arrayContaining(['/dashboard', '/settings/users', '/settings/roles'])
		);
	});

	it('does not render an entry the caller may not open, nor the operator section for a tenant member', async () => {
		await render({}, SALES_EXECUTIVE);
		expect(hrefs()).not.toContain('/settings/roles');
		expect(hrefs()).not.toContain('/operator/tenants');
		expect(document.body.textContent).not.toContain('Operator');
	});

	it('never lists the operator scope tree ("Tenant context"), in or out of a tenant context', async () => {
		await render({}, OPERATOR_PLATFORM_ADMIN, true);
		expect(hrefs().some((h) => h?.startsWith('/operator/scope'))).toBe(false);
		expect(document.body.textContent).not.toContain('Tenant context');
	});
});

describe('the sidebar in a tenant context', () => {
	it('offers none of the own-tenant entries (the same rule as the horizontal nav)', async () => {
		pageUrl.value = new URL('http://localhost/operator/scope/profile');
		await render({}, OPERATOR_PLATFORM_ADMIN, true);
		for (const own of ['/settings/users', '/settings/tenant', '/permission-requests'])
			expect(hrefs()).not.toContain(own);
	});
});

describe('the icon-only size', () => {
	it('is collapsed, and every link keeps its accessible name as screen-reader text', async () => {
		await render({ sidebar: 'small' });
		expect(document.querySelector('[data-slot="sidebar"][data-state="collapsed"]')).not.toBeNull();
		const links = [...document.querySelectorAll('nav a')];
		expect(links.length).toBeGreaterThan(3);
		for (const a of links) {
			expect(a.textContent?.trim().length, a.outerHTML).toBeGreaterThan(0);
			expect(a.querySelector('[class*="sr-only"]'), a.outerHTML).not.toBeNull();
		}
	});

	it('the large size is expanded', async () => {
		await render({ sidebar: 'large' });
		expect(document.querySelector('[data-slot="sidebar"][data-state="expanded"]')).not.toBeNull();
	});
});

describe('below lg: the sidebar is a sheet', () => {
	beforeEach(() => media.setViewportWidth(500));

	const trigger = () => document.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')!;

	it('renders no desktop sidebar; the trigger has a name and aria-expanded=false', async () => {
		await render({});
		expect(document.querySelector('[data-slot="sidebar-container"]')).toBeNull();
		expect(trigger().textContent).toContain('Toggle sidebar');
		expect(trigger().getAttribute('aria-expanded')).toBe('false');
	});

	it('the trigger opens a named dialog that holds the nav; a followed link closes it', async () => {
		await render({});
		trigger().click();
		flushSync();
		await tick();
		const dialog = document.querySelector('[role="dialog"]');
		expect(dialog).not.toBeNull();
		expect(dialog!.getAttribute('aria-labelledby')).toBeTruthy();
		expect(dialog!.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
		expect(trigger().getAttribute('aria-expanded')).toBe('true');

		const link = dialog!.querySelector<HTMLAnchorElement>('a[href="/dashboard"]')!;
		link.addEventListener('click', (e) => e.preventDefault());
		link.click();
		flushSync();
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
	});

	it('has a visible, named Close for touch users without an Escape key', async () => {
		await render({});
		trigger().click();
		flushSync();
		await tick();
		const dialog = document.querySelector('[role="dialog"]')!;
		const close = dialog.querySelector<HTMLButtonElement>('[data-slot="sheet-close"]');
		expect(close, 'a Close button inside the sheet').not.toBeNull();
		expect(close!.textContent).toContain('Close');
		close!.click();
		flushSync();
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
	});

	it('starts below the notch (--safe-top) and slides in from the start edge in RTL', async () => {
		document.documentElement.setAttribute('dir', 'rtl');
		await render({});
		trigger().click();
		flushSync();
		await tick();
		const content = document.querySelector('[data-mobile="true"]')!;
		expect(content.className).toContain('rtl:data-[side=left]:data-open:slide-in-from-right-10');
		expect(content.querySelector('[class~="pt-(--safe-top)"]')).not.toBeNull();
		document.documentElement.removeAttribute('dir');
	});

	it('growing past lg closes the sheet, and shrinking again does not reopen it', async () => {
		await render({});
		trigger().click();
		flushSync();
		await tick();
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();

		media.setViewportWidth(1280);
		flushSync();
		await tick();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(document.querySelector('[data-slot="sidebar-container"]')).not.toBeNull();

		media.setViewportWidth(500);
		flushSync();
		await tick();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});
});
