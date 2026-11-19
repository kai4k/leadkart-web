import { api } from '#lib/api/client.ts';
import { searchResponseSchema, type SearchResponse } from './schemas';

export interface SearchParams {
	q: string;
	limit?: number;
	include?: string;
}

/** GET /v1/search — Go reads `q`, `limit` and `include` (search_http.go). */
export function omniSearch(params: SearchParams, signal?: AbortSignal): Promise<SearchResponse> {
	return api.get('/v1/search', searchResponseSchema, { query: { ...params }, signal });
}
