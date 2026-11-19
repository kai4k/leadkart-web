import { describe, expect, it, vi } from 'vitest';
import {
	cursorQuery,
	fetchAllPages,
	MAX_PAGE_SIZE,
	nextCursor,
	nextPage,
	toPage,
	type Page
} from '#lib/api/pagination.ts';

describe('pagination', () => {
	it('cursorQuery passes only cursor and page_size', () => {
		expect(cursorQuery({ cursor: 'c', page_size: 50 })).toEqual({ cursor: 'c', page_size: 50 });
	});
	it('cursorQuery clamps page_size to 1..MAX_PAGE_SIZE and drops junk', () => {
		expect(cursorQuery({ page_size: 10_000 }).page_size).toBe(MAX_PAGE_SIZE);
		expect(cursorQuery({ page_size: 0 }).page_size).toBe(1);
		expect(cursorQuery({ page_size: 12.7 }).page_size).toBe(12);
		expect(cursorQuery({ page_size: NaN }).page_size).toBeUndefined();
		expect(cursorQuery({}).page_size).toBeUndefined();
	});
	it('toPage normalises any envelope key and an omitted next_cursor', () => {
		expect(toPage({ users: [1], has_more: false }, 'users')).toEqual({
			items: [1],
			has_more: false,
			next_cursor: undefined
		});
	});
	it('nextCursor is the cursor only while there is more', () => {
		const page = (p: Partial<Page<number>>): Page<number> => ({ items: [], has_more: false, ...p });
		expect(nextCursor(page({ has_more: true, next_cursor: 'n' }))).toBe('n');
		expect(nextCursor(page({ has_more: false, next_cursor: 'n' }))).toBeUndefined();
		expect(nextCursor(page({ has_more: true }))).toBeUndefined();
		expect(nextCursor(page({ has_more: true, next_cursor: '' }))).toBeUndefined();
	});
});

describe('nextPage (the ONE cursor rule: fetchAllPages and the infinite-list hook)', () => {
	const page = (p: Partial<Page<number>>): Page<number> => ({ items: [], has_more: false, ...p });
	it('a fresh cursor is the next page', () => {
		expect(nextPage(page({ has_more: true, next_cursor: 'B' }), new Set(['A']))).toEqual({
			cursor: 'B'
		});
	});
	it('the last page ends it as "last"', () => {
		expect(nextPage(page({ has_more: false }), new Set())).toEqual({
			cursor: undefined,
			reason: 'last'
		});
		expect(nextPage(page({ has_more: true }), new Set())).toEqual({
			cursor: undefined,
			reason: 'last'
		});
	});
	it('a cursor already requested (an echo, or A -> B -> A) ends it as "repeated" and says so in DEV', () => {
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(nextPage(page({ has_more: true, next_cursor: 'A' }), new Set(['A', 'B']))).toEqual({
			cursor: undefined,
			reason: 'repeated'
		});
		expect(err).toHaveBeenCalledTimes(1);
		err.mockRestore();
	});
});

describe('fetchAllPages', () => {
	it('follows next_cursor until has_more is false', async () => {
		const fetchPage = vi
			.fn()
			.mockResolvedValueOnce({ items: [1, 2], has_more: true, next_cursor: 'n1' })
			.mockResolvedValueOnce({ items: [3], has_more: false });
		await expect(fetchAllPages(fetchPage)).resolves.toEqual({ items: [1, 2, 3], truncated: false });
		expect(fetchPage).toHaveBeenNthCalledWith(2, 'n1');
	});
	it('reports truncated when the page cap stops it with more available', async () => {
		const fetchPage = vi.fn().mockImplementation((cursor?: string) =>
			Promise.resolve({
				items: [cursor ?? 'first'],
				has_more: true,
				next_cursor: `c${cursor ? cursor.length : 0}`
			})
		);
		const out = await fetchAllPages(fetchPage, { maxPages: 2 });
		expect(out).toEqual({ items: ['first', 'c0'], truncated: true });
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});
	it('stops and reports truncated when the server echoes the cursor it was just given', async () => {
		const fetchPage = vi
			.fn()
			.mockResolvedValueOnce({ items: [1], has_more: true, next_cursor: 'same' })
			.mockResolvedValue({ items: [2], has_more: true, next_cursor: 'same' });
		const out = await fetchAllPages(fetchPage, { maxPages: 50 });
		expect(out).toEqual({ items: [1, 2], truncated: true });
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});
	it('stops on a repeated cursor that is not an immediate echo (A, B, A) and says so in DEV', async () => {
		const err = vi.spyOn(console, 'error').mockImplementation(() => {});
		const next = ['A', 'B', 'A', 'B'];
		let n = 0;
		const fetchPage = vi
			.fn()
			.mockImplementation(() =>
				Promise.resolve({ items: [n], has_more: true, next_cursor: next[n++] })
			);
		const out = await fetchAllPages(fetchPage, { maxPages: 50 });
		expect(out.truncated).toBe(true);
		expect(fetchPage).toHaveBeenCalledTimes(3);
		expect(err).toHaveBeenCalledTimes(1);
		err.mockRestore();
	});
	it('is not truncated when the cap lands exactly on the last page', async () => {
		const fetchPage = vi.fn().mockResolvedValueOnce({ items: [1], has_more: false });
		await expect(fetchAllPages(fetchPage, { maxPages: 1 })).resolves.toEqual({
			items: [1],
			truncated: false
		});
	});
	it('stops fetching once the signal aborts', async () => {
		const ctrl = new AbortController();
		const fetchPage = vi.fn().mockImplementation(() => {
			ctrl.abort(new DOMException('cancelled', 'AbortError'));
			return Promise.resolve({ items: [1], has_more: true, next_cursor: 'n' });
		});
		await expect(fetchAllPages(fetchPage, { signal: ctrl.signal })).rejects.toMatchObject({
			name: 'AbortError'
		});
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});
});
