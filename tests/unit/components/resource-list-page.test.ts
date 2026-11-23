import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/operator/tenants') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

import ResourceListPage from '#lib/components/data/ResourceListPage.svelte';
import { createBulkSelection } from '#lib/hooks/index.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

const body = createRawSnippet(() => ({ render: () => '<p data-testid="body">rows</p>' }));
const chips = createRawSnippet(() => ({ render: () => '<div data-testid="chips">chips</div>' }));

function render(props: Record<string, unknown>) {
	component = mount(ResourceListPage as never, {
		target,
		props: { title: 'Tenants', children: body, ...props }
	});
	flushSync();
}

beforeEach(() => {
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

describe('ResourceListPage', () => {
	it("renders the title as the page's single h1, with the subtitle as its description", () => {
		render({ subtitle: 'Every company on the platform' });
		const h1s = target.querySelectorAll('h1');
		expect(h1s).toHaveLength(1);
		expect(h1s[0]!.textContent).toContain('Tenants');
		expect(target.textContent).toContain('Every company on the platform');
	});

	it('renders the body', () => {
		render({});
		expect(target.querySelector('[data-testid="body"]')).not.toBeNull();
	});

	it('the search box carries its label and follows the value', () => {
		render({ search: { value: 'acme', onSearch: vi.fn(), label: 'Search tenants' } });
		const input = target.querySelector<HTMLInputElement>('input[type="search"]')!;
		expect(input.getAttribute('aria-label')).toBe('Search tenants');
		expect(input.value).toBe('acme');
	});

	it('without a search there is no search box', () => {
		render({});
		expect(target.querySelector('input[type="search"]')).toBeNull();
	});

	it('shows the chips slot under the toolbar', () => {
		render({ chips, search: { value: '', onSearch: vi.fn(), label: 'Search tenants' } });
		expect(target.querySelector('[data-testid="chips"]')).not.toBeNull();
	});

	it('a link in `headerActions` sits in the header before the buttons (a navigation is a link, not a button)', () => {
		const link = createRawSnippet(() => ({
			render: () => '<a data-testid="to-hierarchy" href="/h">Hierarchy</a>'
		}));
		render({
			headerActions: link,
			primaryAction: { label: 'Add member', onClick: vi.fn() }
		});
		const a = target.querySelector('[data-testid="to-hierarchy"]')!;
		const add = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Add member')
		)!;
		expect(a.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(target.querySelector('[data-page-heading]')!.contains(a)).toBe(true);
	});

	it('the primary action is a button in the header', () => {
		const onClick = vi.fn();
		render({ primaryAction: { label: 'Register tenant', onClick } });
		const button = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Register tenant')
		)!;
		button.click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('the bulk bar appears when something is selected, and clearing empties the selection', () => {
		const selection = createBulkSelection<{ id: string }>();
		selection.toggle('a');
		render({ bulk: { selection, actions: [] } });
		expect(target.textContent).toContain('1');
		expect(target.textContent).toContain('selected');
		const clear = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Clear selection')
		)!;
		clear.click();
		flushSync();
		expect(selection.count).toBe(0);
		expect(target.querySelector('[role="status"]')).toBeNull();
	});
});
