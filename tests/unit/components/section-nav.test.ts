/**
 * SectionNav: the tab row of a settings or tenant-context section. Plain links in a named `<nav>`;
 * the current one says so with `aria-current="page"`.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Building2 } from '#lib/icons/index.ts';

const pageUrl = vi.hoisted(() => ({ value: new URL('http://localhost/settings/tenant/profile') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return pageUrl.value;
		}
	}
}));

import SectionNav from '$layouts/SectionNav.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const tabs = [
	{ href: '/settings/tenant/profile', label: 'Profile', icon: Building2 },
	{ href: '/settings/tenant/settings', label: 'Settings' },
	{ href: '/settings/tenant/activity', label: 'Activity' }
];
const render = () => {
	component = mount(SectionNav, { target, props: { tabs, label: 'Tenant sections' } as never });
	flushSync();
};

beforeEach(() => {
	pageUrl.value = new URL('http://localhost/settings/tenant/profile');
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

describe('SectionNav', () => {
	it('is one nav named by its label, made of links', () => {
		render();
		const nav = document.querySelectorAll('nav');
		expect(nav).toHaveLength(1);
		expect(nav[0]!.getAttribute('aria-label')).toBe('Tenant sections');
		const links = [...nav[0]!.querySelectorAll('a')];
		expect(links.map((a) => a.getAttribute('href'))).toEqual(tabs.map((t) => t.href));
		expect(nav[0]!.querySelector('button')).toBeNull();
	});

	it('marks the current tab aria-current="page" and no other', () => {
		render();
		const current = [...document.querySelectorAll('[aria-current]')];
		expect(current).toHaveLength(1);
		expect(current[0]!.textContent?.trim()).toBe('Profile');
		expect(current[0]!.getAttribute('aria-current')).toBe('page');
	});

	it('follows the route, a child path keeps its tab current', () => {
		pageUrl.value = new URL('http://localhost/settings/tenant/activity/2026');
		render();
		expect(document.querySelector('[aria-current="page"]')!.textContent?.trim()).toBe('Activity');
	});
});
