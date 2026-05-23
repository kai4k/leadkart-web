/**
 * Gateway layer for tenant user management. Every response zod-parsed
 * at the boundary per CLAUDE.md. Tenant scope is the caller's JWT
 * tenant_id — no tenant_id parameter on any call.
 */
import { api, parseResponse } from '$api/client';
import {
	listUsersResponseSchema,
	createUserResponseSchema,
	userDtoSchema,
	searchMembershipsResponseSchema,
	type SearchMembershipsResponse
} from './schemas';
import type {
	ListUsersResponse,
	CreateUserRequest,
	CreateUserResponse,
	DeactivateUserRequest,
	AssignUserRoleRequest,
	ReplacePermissionOverridesRequest,
	AssignManagerRequest,
	UserDto
} from './types';

export async function listUsers(): Promise<ListUsersResponse> {
	const raw = await api.get<unknown>('/v1/users');
	return parseResponse(listUsersResponseSchema, raw);
}

export async function getUser(membershipId: string): Promise<UserDto> {
	const raw = await api.get<unknown>(`/v1/users/${membershipId}`);
	return parseResponse(userDtoSchema, raw);
}

export async function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
	const raw = await api.post<unknown>('/v1/users', req);
	return parseResponse(createUserResponseSchema, raw);
}

export async function deactivateUser(
	membershipId: string,
	body: DeactivateUserRequest
): Promise<UserDto> {
	const raw = await api.post<unknown>(`/v1/users/${membershipId}/deactivate`, body);
	return parseResponse(userDtoSchema, raw);
}

export async function reactivateUser(membershipId: string): Promise<UserDto> {
	const raw = await api.post<unknown>(`/v1/users/${membershipId}/reactivate`);
	return parseResponse(userDtoSchema, raw);
}

export async function assignRole(membershipId: string, body: AssignUserRoleRequest): Promise<void> {
	await api.post<void>(`/v1/users/${membershipId}/roles`, body);
}

export async function revokeRole(membershipId: string, roleId: string): Promise<void> {
	await api.delete<void>(`/v1/users/${membershipId}/roles/${roleId}`);
}

export async function replacePermissionOverrides(
	membershipId: string,
	body: ReplacePermissionOverridesRequest
): Promise<void> {
	await api.patch<void>(`/v1/users/${membershipId}/permission-overrides`, body);
}

export async function assignManager(
	membershipId: string,
	body: AssignManagerRequest
): Promise<void> {
	await api.put<void>(`/v1/users/${membershipId}/manager`, body);
}

export async function removeManager(membershipId: string): Promise<void> {
	await api.delete<void>(`/v1/users/${membershipId}/manager`);
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
	const raw = await api.get<unknown>(`/v1/identity/memberships?${qs.toString()}`);
	return parseResponse(searchMembershipsResponseSchema, raw);
}

export { listRoles } from '$features/roles/api';
