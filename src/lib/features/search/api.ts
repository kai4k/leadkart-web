import { api, parseResponse } from '$api/client';
import { searchResponseSchema, type SearchResponse } from './schemas';

export interface SearchParams {
	q: string;
	limit?: number;
	include?: string;
}

export async function omniSearch(params: SearchParams): Promise<SearchResponse> {
	const qs = new URLSearchParams();
	qs.set('q', params.q);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.include) qs.set('include', params.include);
	const raw = await api.get<unknown>(`/v1/search?${qs}`);
	return parseResponse(searchResponseSchema, raw);
}
