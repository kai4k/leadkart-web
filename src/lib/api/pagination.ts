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
/** What the cursor rule reads of a page (Go omits or nulls `next_cursor` on the last page). */
export type CursorPage = { has_more: boolean; next_cursor?: string | null };

/** The ONE next-page rule: the cursor to ask for, or undefined when this was the last page. */
export function nextCursor(page: CursorPage): string | undefined {
	return page.has_more ? page.next_cursor || undefined : undefined;
}
/** What follows a page: the cursor to request, or why there is none. */
export type NextPage = { cursor: string } | { cursor: undefined; reason: 'last' | 'repeated' };

function resolveNextPage(page: CursorPage, requested: ReadonlySet<string>): NextPage {
	const cursor = nextCursor(page);
	if (cursor === undefined) return { cursor: undefined, reason: 'last' };
	if (requested.has(cursor)) return { cursor: undefined, reason: 'repeated' };
	return { cursor };
}
function reportRepeated(next: NextPage): void {
	if (import.meta.env.DEV && next.cursor === undefined && next.reason === 'repeated') {
		console.error('[api] pagination repeated a cursor; stopping the read');
	}
}

/**
 * THE cursor rule, shared by `fetchAllPages` and the infinite-list hook: the next cursor, or the
 * reason to stop. `requested` holds every cursor already asked for; a page that points back at one
 * (an echo, or A -> B -> A) would repeat pages forever, so it stops as 'repeated' (with a DEV
 * `console.error`) instead of looping.
 */
export function nextPage(page: CursorPage, requested: ReadonlySet<string>): NextPage {
	const next = resolveNextPage(page, requested);
	reportRepeated(next);
	return next;
}

/** Pages already reported as repeating: TanStack asks about the same last page many times per render. */
const reportedRepeats = new WeakSet<object>();

/**
 * TanStack's getNextPageParam for every cursor-paged infinite query: the cursor rule over the
 * cursors the query has already requested (its pageParams). A repeat is reported once per page.
 */
export function nextPageParam(
	last: CursorPage,
	_pages: unknown[],
	_lastParam: string | undefined,
	allParams: ReadonlyArray<string | undefined>
): string | undefined {
	const next = resolveNextPage(
		last,
		new Set(allParams.filter((p): p is string => p !== undefined))
	);
	if (next.cursor === undefined && next.reason === 'repeated' && !reportedRepeats.has(last)) {
		reportedRepeats.add(last);
		reportRepeated(next);
	}
	return next.cursor;
}

/**
 * True when the last page pointed on (`has_more` with a cursor) but the query has no next page:
 * the cursor rule stopped on a repeated cursor. That is not the end of the list, and the footer must
 * not say it is.
 */
export function stoppedEarly(last: CursorPage | undefined, hasNextPage: boolean): boolean {
	return last !== undefined && nextCursor(last) !== undefined && !hasNextPage;
}
export interface AllPages<T> {
	items: T[];
	/** More pages existed but `maxPages` stopped the read; the list is incomplete. */
	truncated: boolean;
}
/**
 * Reads every page (cap: maxPages x page size, 10,000 rows at 200). For Go lists with no
 * server-side search (users). A repeated cursor (see `nextPage`) stops the read as `truncated`, like the cap
 * (callers already warn on `truncated`). Aborting `signal` stops between pages and rejects with its reason.
 */
export async function fetchAllPages<T>(
	fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
	opts: { maxPages?: number; signal?: AbortSignal } = {}
): Promise<AllPages<T>> {
	const { maxPages = 50, signal } = opts;
	const items: T[] = [];
	const seen = new Set<string>();
	let cursor: string | undefined;
	for (let i = 0; i < maxPages; i++) {
		signal?.throwIfAborted();
		const page = await fetchPage(cursor);
		items.push(...page.items);
		const next = nextPage(page, seen);
		if (next.cursor === undefined) return { items, truncated: next.reason === 'repeated' };
		seen.add(next.cursor);
		cursor = next.cursor;
	}
	signal?.throwIfAborted();
	return { items, truncated: true };
}
