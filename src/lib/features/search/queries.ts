import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
import * as api from './api';

/**
 * Omni-search query. `q.length < 2` short-circuits — the spec requires
 * minLength 2 server-side, but we also avoid the round-trip on single
 * characters.
 *
 * keepPreviousData (TanStack term) keeps the last result visible while
 * the next query lands — feels like typeahead without flashing empty
 * states on every keystroke.
 */
export function omniSearchQuery(getQuery: () => string) {
	return createQuery(() => {
		const q = getQuery();
		return {
			queryKey: ['search', 'omni', q],
			queryFn: () => api.omniSearch({ q, limit: 5 }),
			enabled: q.trim().length >= 2,
			placeholderData: keepPreviousData,
			staleTime: 30_000
		};
	});
}
