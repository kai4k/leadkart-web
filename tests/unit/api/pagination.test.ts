import { describe, expect, it, vi } from 'vitest';
import { cursorQuery, fetchAllPages, toPage } from '#lib/api/pagination.ts';

describe('pagination', () => {
	it('cursorQuery passes only cursor and page_size', () => {
		expect(cursorQuery({ cursor: 'c', page_size: 50 })).toEqual({ cursor: 'c', page_size: 50 });
	});
	it('toPage normalises any envelope key and an omitted next_cursor', () => {
		expect(toPage({ users: [1], has_more: false }, 'users')).toEqual({
			items: [1],
			has_more: false,
			next_cursor: undefined
		});
	});
	it('fetchAllPages follows next_cursor until has_more is false', async () => {
		const fetchPage = vi
			.fn()
			.mockResolvedValueOnce({ items: [1, 2], has_more: true, next_cursor: 'n1' })
			.mockResolvedValueOnce({ items: [3], has_more: false });
		await expect(fetchAllPages(fetchPage)).resolves.toEqual([1, 2, 3]);
		expect(fetchPage).toHaveBeenNthCalledWith(2, 'n1');
	});
});
