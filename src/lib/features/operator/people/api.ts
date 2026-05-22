import { api, parseResponse } from '$api/client';
import {
	personDtoSchema,
	listPersonMembershipsResponseSchema,
	personListResponseSchema
} from './schemas';
import type {
	PersonDto,
	ListPersonMembershipsResponse,
	PersonListResponse,
	GlobalSuspendRequest,
	UpdatePersonProfileRequest,
	AnonymisePersonRequest
} from './types';

export type PersonListParams = {
	q?: string;
	cursor?: string | null;
	limit?: number;
	filter?: {
		is_active?: boolean;
		is_globally_suspended?: boolean;
		is_anonymised?: boolean;
	};
};

function buildPersonListQuery(params?: PersonListParams): string {
	const base = '/v1/platform/persons';
	if (!params) return base;
	const qs = new URLSearchParams();
	if (params.q) qs.set('q', params.q);
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (params.filter?.is_active != null) qs.set('filter.is_active', String(params.filter.is_active));
	if (params.filter?.is_globally_suspended != null)
		qs.set('filter.is_globally_suspended', String(params.filter.is_globally_suspended));
	if (params.filter?.is_anonymised != null)
		qs.set('filter.is_anonymised', String(params.filter.is_anonymised));
	const q = qs.toString();
	return q ? `${base}?${q}` : base;
}

/** List persons with optional email/name search — operator-scoped (platform.users.view). */
export async function listPersons(params?: PersonListParams): Promise<PersonListResponse> {
	const raw = await api.get<unknown>(buildPersonListQuery(params));
	return parseResponse(personListResponseSchema, raw);
}

/** Look up a single person by email — operator-scoped (platform.users.view). */
export async function getPersonByEmail(email: string): Promise<PersonDto> {
	const raw = await api.get<unknown>(`/v1/platform/persons/by-email/${encodeURIComponent(email)}`);
	return parseResponse(personDtoSchema, raw);
}

/** Read a Person by ID — operator-scoped (platform.users.view). */
export async function getPerson(personId: string): Promise<PersonDto> {
	const raw = await api.get<unknown>(`/v1/platform/persons/${personId}`);
	return parseResponse(personDtoSchema, raw);
}

/** List all Memberships (across tenants) for a Person — operator-scoped
 *  (platform.users.view). Returns the raw `{ memberships }` envelope. */
export async function listPersonMemberships(
	personId: string
): Promise<ListPersonMembershipsResponse> {
	const raw = await api.get<unknown>(`/v1/platform/persons/${personId}/memberships`);
	return parseResponse(listPersonMembershipsResponseSchema, raw);
}

/** Update a Person's first_name / last_name — operator-scoped
 *  (platform.users.manage). Returns 204 No Content. */
export async function updatePersonProfile(
	personId: string,
	req: UpdatePersonProfileRequest
): Promise<void> {
	await api.patch<void>(`/v1/platform/persons/${personId}/profile`, req);
}

/** Globally suspend a Person across ALL tenants — operator-scoped
 *  (platform.users.manage). A required reason is stored for audit. */
export async function globalSuspend(personId: string, req: GlobalSuspendRequest): Promise<void> {
	await api.post<void>(`/v1/platform/persons/${personId}/global-suspend`, req);
}

/** Lift an existing global suspension — operator-scoped
 *  (platform.users.manage). Returns 204 No Content. */
export async function liftGlobalSuspension(personId: string): Promise<void> {
	await api.post<void>(`/v1/platform/persons/${personId}/lift-global-suspension`, {});
}

/** Irreversibly anonymise a Person (DPDP) — operator-scoped
 *  (identity.users.anonymise). Replaces all PII with placeholders and
 *  deactivates every Membership. A required reason is audited. */
export async function anonymisePerson(
	personId: string,
	req: AnonymisePersonRequest
): Promise<void> {
	await api.post<void>(`/v1/platform/persons/${personId}/anonymise`, req);
}
