/**
 * Gateway layer for tenant user management. Tenant scope is the caller's
 * JWT tenant_id — no tenant_id parameter on any call. Go answers every
 * mutation here with 204 (or 201 + ids for create), so mutations return void.
 */
import { api, apiLegacy, parseResponse } from '#lib/api/client.ts';
import {
	cursorQuery,
	fetchAllPages,
	MAX_PAGE_SIZE,
	toPage,
	type AllPages,
	type CursorParams,
	type Page
} from '#lib/api/pagination.ts';
import {
	listUsersResponseSchema,
	createUserResponseSchema,
	userDtoSchema,
	searchMembershipsResponseSchema,
	type SearchMembershipsResponse
} from './schemas';
import type {
	CreateUserRequest,
	CreateUserResponse,
	DeactivateUserRequest,
	AssignUserRoleRequest,
	ReplacePermissionOverridesRequest,
	AssignManagerRequest,
	UserDto
} from './types';

/** GET /v1/users — active members only, one cursor page (users_http.go:61). */
export async function listUsersPage(p: CursorParams, signal?: AbortSignal): Promise<Page<UserDto>> {
	return toPage(
		await api.get('/v1/users', listUsersResponseSchema, { query: cursorQuery(p), signal }),
		'users'
	);
}

/** Every active member, following next_cursor (the directory has no server-side search). `truncated` = the page cap stopped the read. */
export function listAllUsers(signal?: AbortSignal): Promise<AllPages<UserDto>> {
	return fetchAllPages((cursor) => listUsersPage({ cursor, page_size: MAX_PAGE_SIZE }, signal), {
		signal
	});
}

export function getUser(membershipId: string, signal?: AbortSignal): Promise<UserDto> {
	return api.get(`/v1/users/${membershipId}`, userDtoSchema, { signal });
}

export function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
	return api.postJson('/v1/users', req, createUserResponseSchema);
}

export async function deactivateUser(
	membershipId: string,
	body: DeactivateUserRequest
): Promise<void> {
	await api.post(`/v1/users/${membershipId}/deactivate`, body);
}

export async function reactivateUser(membershipId: string): Promise<void> {
	await api.post(`/v1/users/${membershipId}/reactivate`);
}

export async function assignRole(membershipId: string, body: AssignUserRoleRequest): Promise<void> {
	await api.post(`/v1/users/${membershipId}/roles`, body);
}

export async function revokeRole(membershipId: string, roleId: string): Promise<void> {
	await api.delete(`/v1/users/${membershipId}/roles/${roleId}`);
}

export async function replacePermissionOverrides(
	membershipId: string,
	body: ReplacePermissionOverridesRequest
): Promise<void> {
	await api.patch(`/v1/users/${membershipId}/permission-overrides`, body);
}

export async function assignManager(
	membershipId: string,
	body: AssignManagerRequest
): Promise<void> {
	await api.put(`/v1/users/${membershipId}/manager`, body);
}

export async function removeManager(membershipId: string): Promise<void> {
	await api.delete(`/v1/users/${membershipId}/manager`);
}

/**
 * Search memberships in the current tenant by free-text query. Backs
 * the lead-reassignment Combobox typeahead. The Go endpoint is planned
 * (see CRM contracts §reassignment); the BFF proxy already forwards
 * `/api/v1/identity/memberships?q=…` untouched. Returns up to ~20
 * matches keyed on first/last name + email substring.
 */
export async function searchMemberships(q: string): Promise<SearchMembershipsResponse> {
	const qs = new URLSearchParams();
	qs.set('q', q);
	const raw = await apiLegacy.get<unknown>(`/v1/identity/memberships?${qs.toString()}`);
	return parseResponse(searchMembershipsResponseSchema, raw);
}
