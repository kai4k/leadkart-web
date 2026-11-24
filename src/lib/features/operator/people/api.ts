import { seg } from '#lib/utils/path-segment.ts';
import { apiLegacy, parseResponse } from '#lib/api/client.ts';
import { omniSearch, type SearchPersonHit } from '$features/search';
import { personDtoSchema, listPersonMembershipsResponseSchema } from './schemas';
import type { PersonDto, ListPersonMembershipsResponse, GlobalSuspendRequest } from './types';

/** Go cuts the search text at 100 BYTES; cut here on a character boundary, never inside one. */
export function limitSearchBytes(q: string, max = 100): string {
	const enc = new TextEncoder();
	let out = '';
	let used = 0;
	for (const ch of q) {
		used += enc.encode(ch).length;
		if (used > max) break;
		out += ch;
	}
	return out;
}

/** What a person search found. `has_partial`: Go gave up on the query after its time limit, so people may be missing. */
export type PersonSearchResult = { persons: SearchPersonHit[]; has_partial: boolean };

/**
 * Persons whose email or name match `q` — `GET /v1/search?include=persons` (2-100 characters, up to 20 hits).
 * `has_partial` travels with the hits: an empty list from a search that timed out is NOT "no one matches".
 */
export async function searchPersons(q: string, signal?: AbortSignal): Promise<PersonSearchResult> {
	const res = await omniSearch(
		{ q: limitSearchBytes(q.trim()), include: 'persons', limit: 20 },
		signal
	);
	return { persons: res.persons, has_partial: res.has_partial };
}

/** Read a Person by ID — operator-scoped (platform.users.view). */
export async function getPerson(personId: string): Promise<PersonDto> {
	const raw = await apiLegacy.get<unknown>(`/v1/platform/persons/${seg(personId)}`);
	return parseResponse(personDtoSchema, raw);
}

/** List all Memberships (across tenants) for a Person — operator-scoped
 *  (platform.users.view). Returns the raw `{ memberships }` envelope. */
export async function listPersonMemberships(
	personId: string
): Promise<ListPersonMembershipsResponse> {
	const raw = await apiLegacy.get<unknown>(`/v1/platform/persons/${seg(personId)}/memberships`);
	return parseResponse(listPersonMembershipsResponseSchema, raw);
}

/** Globally suspend a Person across ALL tenants — operator-scoped
 *  (platform.users.manage). A required reason is stored for audit. */
export async function globalSuspend(personId: string, req: GlobalSuspendRequest): Promise<void> {
	await apiLegacy.post<void>(`/v1/platform/persons/${seg(personId)}/global-suspend`, req);
}

/** Lift an existing global suspension — operator-scoped
 *  (platform.users.manage). Returns 204 No Content. */
export async function liftGlobalSuspension(personId: string): Promise<void> {
	await apiLegacy.post<void>(`/v1/platform/persons/${seg(personId)}/lift-global-suspension`, {});
}
