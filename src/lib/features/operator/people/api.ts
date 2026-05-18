import { api } from '$api/client';
import { personDtoSchema, listPersonMembershipsResponseSchema } from './schemas';
import type {
	PersonDto,
	ListPersonMembershipsResponse,
	GlobalSuspendRequest,
	UpdatePersonProfileRequest,
	AnonymisePersonRequest
} from './types';

/** Read a Person by ID — operator-scoped (platform.users.view). */
export async function getPerson(personId: string): Promise<PersonDto> {
	const raw = await api.get<unknown>(`/v1/platform/persons/${personId}`);
	return personDtoSchema.parse(raw);
}

/** List all Memberships (across tenants) for a Person — operator-scoped
 *  (platform.users.view). Returns the raw `{ memberships }` envelope. */
export async function listPersonMemberships(
	personId: string
): Promise<ListPersonMembershipsResponse> {
	const raw = await api.get<unknown>(`/v1/platform/persons/${personId}/memberships`);
	return listPersonMembershipsResponseSchema.parse(raw);
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

/**
 * TODO(backend): GET /v1/platform/persons (list) does not exist.
 * When it ships, add listPersons() returning a paginated response, and
 * update OperatorPeopleStore.load() to use it instead of lookupById().
 */
