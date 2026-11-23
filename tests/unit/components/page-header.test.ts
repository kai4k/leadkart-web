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

	it('a trail of one crumb that repeats the title is not rendered', () => {
		pageUrl.value = new URL('http://localhost/dashboard');
		render({ title: 'Dashboard' });
		expect(document.querySelector('nav')).toBeNull();
		expect(document.querySelectorAll('h1')).toHaveLength(1);
	});

	it('an explicit single crumb equal to the title is not rendered either', () => {
		render({ title: 'Acme', crumbs: [{ label: 'Acme' }] });
		expect(document.querySelector('nav')).toBeNull();
	});

	it('a trail of fewer than two items is not rendered, whatever the label', () => {
		render({ title: 'Acme', crumbs: [{ label: 'Tenants' }] });
		expect(document.querySelector('nav')).toBeNull();
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

describe('PageHeader breadcrumb sits above the title', () => {
	it('the trail comes before the h1 in the heading block, and the actions stay on the end side', () => {
		render({ title: 'Team', actions: snippet('<button id="act">Add</button>') });
		const nav = document.querySelector('nav[aria-label="Breadcrumb"]')!;
		const h1 = document.querySelector('h1')!;
		expect(nav.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		const block = document.querySelector('[data-page-heading] > div')!;
		expect(block.contains(nav)).toBe(true);
		expect(block.contains(document.querySelector('#act'))).toBe(false);
	});
});

describe('PageHeader below a layout that already shows one', () => {
	it('is a section title (h2) with no second trail: the page keeps exactly one h1', async () => {
		const { default: Host } = await import('../stubs/NestedHeaderHost.svelte');
		if (component) unmount(component);
		component = mount(Host, { target });
		flushSync();
		expect(document.querySelectorAll('h1')).toHaveLength(1);
		expect(document.querySelector('h1')!.textContent?.trim()).toBe('Acme');
		const h2 = document.querySelectorAll('h2');
		expect(h2).toHaveLength(1);
		expect(h2[0]!.textContent?.trim()).toBe('Team');
		expect(document.querySelectorAll('nav[aria-label="Breadcrumb"]')).toHaveLength(1);
	});
});

describe('PageHeader leading slot (a back link above the title)', () => {
	it('renders the leading content before the h1, inside the heading block', () => {
		render({ title: 'Team', leading: snippet('<a id="back" href="/x">Back</a>') });
		const back = document.querySelector('#back')!;
		const h1 = document.querySelector('h1')!;
		expect(back.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(document.querySelector('[data-page-heading]')!.contains(back)).toBe(true);
	});
	it('renders nothing extra without it', () => {
		render({ title: 'Team' });
		expect(document.querySelector('[data-page-heading] .mb-1')).toBeNull();
	});
});

describe('PageHeader: a title that is a name somebody else typed', () => {
	it('`isolated` wraps the title in <bdi>, and a crumb marked `isolate` too; otherwise neither', () => {
		render({
			title: 'Acme‮',
			isolated: true,
			crumbs: [
				{ label: 'Tenants', href: '/operator/tenants' },
				{ label: 'Acme‮', isolate: true }
			]
		});
		expect(document.querySelector('h1 bdi')!.textContent).toBe('Acme‮');
		expect(document.querySelectorAll('nav li bdi')).toHaveLength(1);
		expect(document.querySelector('nav li a bdi')).toBeNull();
	});
	it('a plain title has no <bdi>', () => {
		render({ title: 'Team' });
		expect(document.querySelector('bdi')).toBeNull();
	});
});
