/** Cursor pagination as Go implements it: ?cursor=&page_size= (users_http.go:73-79, crm/ports/http.go:119-129),
 * envelope { <items|users|events|requests>, has_more, next_cursor? } — next_cursor is omitted on the last page. */
import type { QueryParams } from './client.ts';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export interface CursorParams {
	cursor?: string;
	page_size?: number;
}
export interface Page<T> {
	items: T[];
	has_more: boolean;
	next_cursor?: string;
}

export function cursorQuery(p: CursorParams = {}): QueryParams {
	return { cursor: p.cursor, page_size: p.page_size };
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
/** Reads every page (cap: maxPages × page size, 10,000 rows at 200). For Go lists with no server-side search (users). */
export async function fetchAllPages<T>(
	fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
	maxPages = 50
): Promise<T[]> {
	const out: T[] = [];
	let cursor: string | undefined;
	for (let i = 0; i < maxPages; i++) {
		const page = await fetchPage(cursor);
		out.push(...page.items);
		if (!page.has_more || !page.next_cursor) break;
		cursor = page.next_cursor;
	}
	return out;
}
