/**
 * The horizontal nav: the same nav config as the sidebar (same filtering), one dropdown per titled
 * section and a direct link for the untitled one. The section that holds the current page marks its
 * trigger `aria-current="true"`; a tenant member never sees the operator section.
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	NEW_TENANT_ADMIN,
	OPERATOR_PLATFORM_ADMIN,
	SALES_EXECUTIVE,
	SUPER_USER
} from '../../support/go-personas.ts';
import type { Capabilities } from '#lib/features/auth/capabilities.ts';

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

import HorizontalNav from '#lib/layouts/HorizontalNav.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

async function render(caps: Capabilities, inTenantContext = false) {
	sessionState.capabilities = caps;
	sessionState.inTenantContext = inTenantContext;
	component = mount(HorizontalNav, { target });
	flushSync();
	await tick();
}

const triggers = () => [
	...document.querySelectorAll<HTMLButtonElement>('nav [data-slot="dropdown-menu-trigger"]')
];
const names = (els: Element[]) => els.map((e) => e.textContent?.trim());

async function open(trigger: HTMLButtonElement) {
	trigger.focus();
	trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
	flushSync();
	await tick();
	await tick();
}

beforeEach(() => {
	pageUrl.value = new URL('http://localhost/settings/users');
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

describe('the horizontal nav', () => {
	it('is one localised "Main navigation" landmark', async () => {
		await render(SUPER_USER);
		const navs = document.querySelectorAll('nav');
		expect(navs).toHaveLength(1);
		expect(navs[0]!.getAttribute('aria-label')).toBe('Main navigation');
	});

	it('renders one dropdown trigger per titled section and a direct Dashboard link', async () => {
		await render(SUPER_USER);
		expect(names(triggers())).toEqual(expect.arrayContaining(['Operator', 'Administration']));
		const direct = [...document.querySelectorAll('nav > ul > li > a')];
		expect(direct.map((a) => a.getAttribute('href'))).toEqual(['/dashboard']);
		// sections with a title are triggers, not links
		expect(document.querySelectorAll('nav > ul > li > a')).toHaveLength(1);
	});

	it('opening "Administration" lists Team and Roles as links', async () => {
		await render(NEW_TENANT_ADMIN);
		const admin = triggers().find((t) => t.textContent?.includes('Administration'))!;
		expect(admin.getAttribute('aria-expanded')).toBe('false');
		await open(admin);
		expect(admin.getAttribute('aria-expanded')).toBe('true');
		const menu = document.querySelector('[data-slot="dropdown-menu-content"]')!;
		const links = [...menu.querySelectorAll('a')];
		expect(names(links)).toEqual(expect.arrayContaining(['Team', 'Roles']));
		expect(links.find((a) => a.textContent?.includes('Team'))!.getAttribute('href')).toBe(
			'/settings/users'
		);
		// the active page is marked inside the menu, and the section's trigger says it holds the page
		expect(links.find((a) => a.textContent?.includes('Team'))!.getAttribute('aria-current')).toBe(
			'page'
		);
		expect(admin.getAttribute('aria-current')).toBe('true');
	});

	it('a section that does not hold the page has no aria-current on its trigger', async () => {
		await render(SUPER_USER);
		const operator = triggers().find((t) => t.textContent?.includes('Operator'))!;
		expect(operator.hasAttribute('aria-current')).toBe(false);
	});

	it('a tenant member sees no operator section and no entry they may not open', async () => {
		await render(SALES_EXECUTIVE);
		expect(names(triggers())).not.toContain('Operator');
		expect(document.body.textContent).not.toContain('Operator');
		const admin = triggers().find((t) => t.textContent?.includes('Administration'));
		if (admin) {
			await open(admin as HTMLButtonElement);
			const menu = document.querySelector('[data-slot="dropdown-menu-content"]')!;
			expect([...menu.querySelectorAll('a')].map((a) => a.getAttribute('href'))).not.toContain(
				'/settings/roles'
			);
		}
	});

	it('marks the direct Dashboard link aria-current="page" on the dashboard, and only then', async () => {
		pageUrl.value = new URL('http://localhost/dashboard');
		await render(NEW_TENANT_ADMIN);
		const link = document.querySelector('nav > ul > li > a[href="/dashboard"]')!;
		expect(link.getAttribute('aria-current')).toBe('page');
		if (component) unmount(component);
		component = undefined;
		document.body.innerHTML = '';
		target = document.body.appendChild(document.createElement('div'));
		pageUrl.value = new URL('http://localhost/settings/users');
		await render(NEW_TENANT_ADMIN);
		expect(
			document.querySelector('nav > ul > li > a[href="/dashboard"]')!.hasAttribute('aria-current')
		).toBe(false);
	});

	it('in a tenant context the own-tenant entries are not offered (the same rule as the sidebar)', async () => {
		pageUrl.value = new URL('http://localhost/operator/scope/profile');
		await render(OPERATOR_PLATFORM_ADMIN, true);
		const hrefs: Array<string | null> = [];
		for (const t of triggers()) {
			await open(t);
			for (const a of document.querySelectorAll('[data-slot="dropdown-menu-content"] a'))
				hrefs.push(a.getAttribute('href'));
			t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			flushSync();
			await tick();
		}
		for (const own of ['/settings/users', '/settings/tenant', '/permission-requests'])
			expect(hrefs).not.toContain(own);
	});
});
