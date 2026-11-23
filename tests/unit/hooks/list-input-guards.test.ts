import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';

const goto = vi.hoisted(() => vi.fn());
const url = vi.hoisted(() => ({ current: new URL('http://x/settings/users') }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		}
	}
}));

import { createListPagination } from '#lib/hooks/use-list-pagination.svelte.ts';
import { createBulkSelection } from '#lib/hooks/use-bulk-selection.svelte.ts';
import { useUrlTab } from '#lib/hooks/use-url-tab.svelte.ts';
import { limitSearchBytes } from '#lib/features/operator/people/api.ts';
import { inRoot } from './root.svelte.ts';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

const at = (search: string) => {
	url.current = new URL(`http://x/settings/users${search}`);
};
const ITEMS = Array.from({ length: 25 }, (_, i) => i + 1);

describe('createListPagination: the page in the URL', () => {
	const page = () => createListPagination(() => ITEMS, { pageSize: 10 });

	it.each([
		['', 1],
		['?page=2', 2],
		['?page=3', 3]
	])('%s is page %i', (search, expected) => {
		at(search);
		expect(page().currentPage).toBe(expected);
	});

	it.each(['?page=999', '?page=999999999', '?page=4'])(
		'%s is capped at the last page, so the list is never empty',
		(search) => {
			at(search);
			const p = page();
			expect(p.currentPage).toBe(3);
			expect(p.paged).toHaveLength(5);
		}
	);

	it.each([
		'?page=1e3',
		'?page=0x10',
		'?page=-2',
		'?page=0',
		'?page=abc',
		'?page=2.5',
		'?page=02',
		'?page=1234567890',
		'?page='
	])('%s is not a page number: page 1', (search) => {
		at(search);
		expect(page().currentPage).toBe(1);
	});
});

describe('createBulkSelection(getScopeKey)', () => {
	it('clears when the search or filter key changes, not before', () => {
		const props = reactiveProps({ key: 'q=|status=all' });
		const { value: selection, dispose } = inRoot(() =>
			createBulkSelection<{ id: string }>(() => props.key)
		);
		flushSync();
		selection.toggle('ravi');
		flushSync();
		expect(selection.count).toBe(1);
		props.key = 'q=asha|status=all';
		flushSync();
		expect(selection.count).toBe(0);
		selection.toggle('asha');
		flushSync();
		expect(selection.count).toBe(1);
		dispose();
	});

	it('keeps the selection while the key stays the same', () => {
		const props = reactiveProps({ key: 'a', unrelated: 0 });
		const { value: selection, dispose } = inRoot(() =>
			createBulkSelection<{ id: string }>(() => props.key)
		);
		flushSync();
		selection.toggle('x');
		props.unrelated = 1;
		flushSync();
		expect(selection.count).toBe(1);
		dispose();
	});

	it('works without a key, outside a component', () => {
		const selection = createBulkSelection<{ id: string }>();
		selection.toggle('x');
		expect(selection.count).toBe(1);
	});
});

describe('useUrlTab as the allowlist of a detail page', () => {
	it('an unknown ?tab= is the first tab', () => {
		at('?tab=foo');
		expect(useUrlTab('overview', ['overview', 'reports']).value).toBe('overview');
	});
	it('a known one is kept', () => {
		at('?tab=reports');
		expect(useUrlTab('overview', ['overview', 'reports']).value).toBe('reports');
	});
});

describe('limitSearchBytes: Go reads 100 bytes of a search', () => {
	it('leaves a short search alone', () => {
		expect(limitSearchBytes('asha')).toBe('asha');
	});
	it('cuts ASCII at 100 characters', () => {
		expect(limitSearchBytes('a'.repeat(150))).toHaveLength(100);
	});
	it('never cuts inside a multi-byte character (each Devanagari letter is 3 bytes)', () => {
		const cut = limitSearchBytes('अ'.repeat(50));
		expect([...cut]).toHaveLength(33);
		expect(new TextEncoder().encode(cut).length).toBeLessThanOrEqual(100);
	});
});
