import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { inRoot } from './root.svelte.ts';
import {
	createFakeInfiniteQuery,
	installFakeIntersectionObserver
} from '../components/fake-infinite-query.svelte.ts';

const h = vi.hoisted(() => ({ query: undefined as unknown }));
vi.mock('@tanstack/svelte-query', () => ({ createInfiniteQuery: () => h.query }));

import { createInfiniteList } from '#lib/hooks/use-infinite-list.svelte.ts';

afterEach(() => vi.unstubAllGlobals());

describe('createInfiniteList sentinel', () => {
	it('does not auto-fetch after an empty page (the button stays for a manual retry)', () => {
		const fake = createFakeInfiniteQuery();
		h.query = fake;
		const io = installFakeIntersectionObserver();
		const { value: list, dispose } = inRoot(() =>
			createInfiniteList<number>({ queryKey: () => ['t'], queryFn: vi.fn() })
		);
		list.sentinelRef = document.createElement('div');
		flushSync();
		fake.land({ empty: true });
		flushSync();
		io.live()[0]?.fire(true);
		expect(fake.fetchNextPage).not.toHaveBeenCalled();
		// a later page with rows resumes auto-loading
		fake.land();
		flushSync();
		io.live()[0]?.fire(true);
		expect(fake.fetchNextPage).toHaveBeenCalledTimes(1);
		dispose();
	});

	it('disconnects the observer when the owner is destroyed', () => {
		const fake = createFakeInfiniteQuery();
		h.query = fake;
		const io = installFakeIntersectionObserver();
		const { value: list, dispose } = inRoot(() =>
			createInfiniteList<number>({ queryKey: () => ['t'], queryFn: vi.fn() })
		);
		list.sentinelRef = document.createElement('div');
		flushSync();
		expect(io.live()).toHaveLength(1);
		dispose();
		expect(io.live()).toHaveLength(0);
	});

	it('re-checks the sentinel after each page lands, so a sentinel still in view fetches again', () => {
		const fake = createFakeInfiniteQuery();
		h.query = fake;
		const io = installFakeIntersectionObserver();
		const { value: list, dispose } = inRoot(() =>
			createInfiniteList<number>({ queryKey: () => ['t'], queryFn: vi.fn() })
		);
		list.sentinelRef = document.createElement('div');
		flushSync();

		expect(io.live()).toHaveLength(1);
		io.live()[0]?.fire(true);
		expect(fake.fetchNextPage).toHaveBeenCalledTimes(1);

		// The page lands and the sentinel is STILL in view: no scroll happens, so only a fresh
		// observer reports it again.
		fake.land();
		flushSync();
		expect(io.instances).toHaveLength(2);
		expect(io.live()).toHaveLength(1);
		io.live()[0]?.fire(true);
		expect(fake.fetchNextPage).toHaveBeenCalledTimes(2);
		dispose();
	});
});
