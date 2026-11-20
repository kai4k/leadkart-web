/**
 * PageHeader: the page's ONLY `<h1>`, with the breadcrumb trail on the end side (ending in the
 * current page), the description, a `meta` slot beside the title and an `actions` slot.
 */
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pageUrl = vi.hoisted(() => ({ value: new URL('http://localhost/settings/users') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return pageUrl.value;
		}
	}
}));

import PageHeader from '$layouts/PageHeader.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const render = (props: Record<string, unknown>) => {
	component = mount(PageHeader, { target, props: props as never });
	flushSync();
};
const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

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

describe('PageHeader', () => {
	it('renders exactly one h1 with the title', () => {
		render({ title: 'Team' });
		const h1 = document.querySelectorAll('h1');
		expect(h1).toHaveLength(1);
		expect(h1[0]!.textContent).toBe('Team');
		expect(document.querySelectorAll('h2,h3,h4,h5,h6')).toHaveLength(0);
	});

	it('the breadcrumb nav ends in the current page, aria-current="page"', () => {
		render({ title: 'Team' });
		const nav = document.querySelector('nav[aria-label="Breadcrumb"]')!;
		expect(nav).not.toBeNull();
		const items = [...nav.querySelectorAll('li')];
		const last = items[items.length - 1]!;
		expect(last.getAttribute('aria-current')).toBe('page');
		expect(last.textContent?.trim()).toBe('Team');
		expect(nav.querySelectorAll('[aria-current]')).toHaveLength(1);
	});

	it('the default trail is the route: nav entries are links, the title closes it', () => {
		pageUrl.value = new URL('http://localhost/operator/scope/profile');
		render({ title: 'Profile' });
		const links = [...document.querySelectorAll('nav[aria-label="Breadcrumb"] a')];
		expect(links.length).toBeGreaterThan(0);
		for (const a of links) expect(a.getAttribute('href')).toMatch(/^\//);
	});

	it('an explicit trail replaces the default one', () => {
		render({
			title: 'Acme',
			crumbs: [{ label: 'Tenants', href: '/operator/tenants' }, { label: 'Acme' }]
		});
		const items = [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) =>
			li.textContent?.trim()
		);
		expect(items).toEqual(['Tenants', 'Acme']);
		expect(document.querySelector('nav a')!.getAttribute('href')).toBe('/operator/tenants');
	});

	it('crumbs=[] renders no navigation at all', () => {
		render({ title: 'Team', crumbs: [] });
		expect(document.querySelector('nav')).toBeNull();
		expect(document.querySelector('h1')!.textContent).toBe('Team');
	});

	it('renders the description, the meta beside the title and the actions', () => {
		render({
			title: 'Team',
			description: 'People in your company',
			meta: snippet('<span data-testid="meta">Platform</span>'),
			actions: snippet('<button>Add member</button>')
		});
		expect(document.body.textContent).toContain('People in your company');
		expect(document.querySelector('[data-testid="meta"]')).not.toBeNull();
		expect(document.querySelector('button')!.textContent).toBe('Add member');
	});

	it('a title is text, never markup', () => {
		render({ title: '<img src=x onerror=alert(1)>' });
		expect(document.querySelector('h1 img')).toBeNull();
	});
});
