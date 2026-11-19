/** Cursor pagination as Go implements it: ?cursor=&page_size= (users_http.go:73-79, crm/ports/http.go:119-129),
 * envelope { <items|users|events|requests>, has_more, next_cursor? } — next_cursor is omitted on the last page. */
import type { QueryParams } from './client.ts';

export const MAX_PAGE_SIZE = 200;
export interface CursorParams {
	cursor?: string;
	page_size?: number;
}
/** THE page shape (also what `createInfiniteList` pages are). */
export interface Page<T> {
	items: T[];
	has_more: boolean;
	next_cursor?: string;
}

/** `page_size` is clamped to 1..MAX_PAGE_SIZE (Go rejects/ignores larger values); NaN is dropped. */
export function cursorQuery(p: CursorParams = {}): QueryParams {
	const size = p.page_size;
	const clamped =
		size === undefined || !Number.isFinite(size)
			? undefined
			: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(size)));
	return { cursor: p.cursor, page_size: clamped };
}
export function toPage<K extends string, T>(
	envelope: { [P in K]: T[] } & { has_more: boolean; next_cursor?: string },
	key: K
): Page<T> {
	return {
		items: envelope[key],
		has_more: envelope.has_more,
		next_cursor: envelope.next_cursor || undefined
	};
}
/** The ONE next-page rule: the cursor to ask for, or undefined when this was the last page. */
export function nextCursor(page: Page<unknown>): string | undefined {
	return page.has_more ? page.next_cursor || undefined : undefined;
}
export interface AllPages<T> {
	items: T[];
	/** More pages existed but `maxPages` stopped the read; the list is incomplete. */
	truncated: boolean;
}
/**
 * Reads every page (cap: maxPages x page size, 10,000 rows at 200). For Go lists with no
 * server-side search (users). Aborting `signal` stops between pages and rejects with its reason.
 */
export async function fetchAllPages<T>(
	fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
	opts: { maxPages?: number; signal?: AbortSignal } = {}
): Promise<AllPages<T>> {
	const { maxPages = 50, signal } = opts;
	const items: T[] = [];
	let cursor: string | undefined;
	for (let i = 0; i < maxPages; i++) {
		signal?.throwIfAborted();
		const page = await fetchPage(cursor);
		items.push(...page.items);
		cursor = nextCursor(page);
		if (cursor === undefined) return { items, truncated: false };
	}
	signal?.throwIfAborted();
	return { items, truncated: true };
}
