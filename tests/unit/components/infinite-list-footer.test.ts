import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import InfiniteListFooter from '#lib/components/data/InfiniteListFooter.svelte';
import { createFakeInfiniteQuery } from './fake-infinite-query.svelte.ts';

// The footer reads the infinite-list object; this one is a reactive double of it.
function fakeList(opts: { hasNextPage?: boolean } = {}) {
	const query = createFakeInfiniteQuery({ hasNextPage: opts.hasNextPage ?? true });
	const list = {
		query,
		sentinelRef: null as HTMLElement | null,
		get items() {
			return [1];
		},
		get hasNextPage() {
			return query.hasNextPage;
		},
		get isFetchingNextPage() {
			return query.isFetchingNextPage;
		}
	};
	return { list, query };
}

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
function render(list: unknown) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(InfiniteListFooter, { target, props: { list: list as never } });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

describe('InfiniteListFooter', () => {
	it('gives the sentinel to the list and keeps one always-mounted status region', () => {
		const { list } = fakeList();
		render(list);
		expect(list.sentinelRef).toBeInstanceOf(HTMLElement);
		const status = target.querySelector('[aria-live="polite"]');
		expect(status).not.toBeNull();
		expect(status?.textContent?.trim()).toBe('');
	});

	it('"Load more" fetches the next page', () => {
		const { list, query } = fakeList();
		render(list);
		const button = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Load more')
		);
		expect(button).toBeDefined();
		button?.click();
		expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('announces loading by changing the text inside the same live region', () => {
		const { list, query } = fakeList();
		render(list);
		const status = target.querySelector('[aria-live="polite"]');
		query.setFetching(true);
		flushSync();
		expect(target.querySelector('[aria-live="polite"]')).toBe(status);
		expect(status?.textContent).toContain('Loading more');
		// Focusable while loading (aria-disabled, not disabled): see the focus tests below.
		const button = target.querySelector('button');
		expect(button?.disabled).toBe(false);
		expect(button?.getAttribute('aria-disabled')).toBe('true');
		expect(button?.getAttribute('aria-busy')).toBe('true');
	});

	it('keeps keyboard focus on "Load more" while a page loads, and ignores clicks meanwhile', () => {
		const { list, query } = fakeList();
		render(list);
		const button = target.querySelector('button') as HTMLButtonElement;
		button.focus();
		expect(document.activeElement).toBe(button);
		query.setFetching(true);
		flushSync();
		expect(document.activeElement).toBe(button);
		button.click();
		expect(query.fetchNextPage).not.toHaveBeenCalled();
		query.setFetching(false);
		flushSync();
		expect(button.getAttribute('aria-disabled')).toBeNull();
		expect(button.hasAttribute('aria-busy')).toBe(false);
		button.click();
		expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('moves focus to the status region when the last page lands and the button goes away', async () => {
		const { list, query } = fakeList();
		render(list);
		const button = target.querySelector('button') as HTMLButtonElement;
		button.focus();
		query.land({ hasNextPage: false });
		flushSync();
		await tick();
		expect(target.querySelector('button')).toBeNull();
		const status = target.querySelector('[aria-live="polite"]');
		expect(status?.getAttribute('tabindex')).toBe('-1');
		expect(document.activeElement).toBe(status);
	});

	it('leaves focus alone when the button was not focused', async () => {
		const { list, query } = fakeList();
		render(list);
		query.land({ hasNextPage: false });
		flushSync();
		await tick();
		expect(document.activeElement).toBe(document.body);
	});

	it('shows one end-of-list line and no button on the last page', () => {
		const { list } = fakeList({ hasNextPage: false });
		render(list);
		expect(target.querySelector('[aria-live="polite"]')?.textContent).toContain('End of list');
		expect(target.querySelector('button')).toBeNull();
	});
});
