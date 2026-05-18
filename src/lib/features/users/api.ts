/**
 * Gateway layer for tenant user management. Every response zod-parsed
 * at the boundary per CLAUDE.md. Tenant scope is the caller's JWT
 * tenant_id — no tenant_id parameter on any call.
 */
import { api, withTenant } from '$api/client';
import { listUsersResponseSchema, createUserResponseSchema, userDtoSchema } from './schemas';
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

/**
 * Try to parse a 200+body response as UserDto.
 * Returns the DTO when the server sends one (E4 pattern), undefined for 204.
 */
function parseUserOrVoid(raw: unknown): UserDto | void {
	if (raw === null || raw === undefined || raw === '') return;
	const result = userDtoSchema.safeParse(raw);
	return result.success ? result.data : undefined;
}

export async function listUsers(): Promise<ListUsersResponse> {
	const raw = await api.get<unknown>('/v1/users');
	return listUsersResponseSchema.parse(raw);
}

/**
 * Operator-scope variant — fetches members of any tenant by injecting
 * X-Tenant-Id. Used by operator/tenants/[slug]/members and the
 * extended UsersStore.loadForTenant().
 */
export async function listUsersScoped(tenantId: string): Promise<ListUsersResponse> {
	const raw = await withTenant(tenantId).get<unknown>('/v1/users');
	return listUsersResponseSchema.parse(raw);
}

export async function getUser(membershipId: string): Promise<UserDto> {
	const raw = await api.get<unknown>(`/v1/users/${membershipId}`);
	return userDtoSchema.parse(raw);
}

export async function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
	const raw = await api.post<unknown>('/v1/users', req);
	return createUserResponseSchema.parse(raw);
}

export async function deactivateUser(
	membershipId: string,
	body: DeactivateUserRequest
): Promise<UserDto | void> {
	const raw = await api.post<unknown>(`/v1/users/${membershipId}/deactivate`, body);
	return parseUserOrVoid(raw);
}

export async function reactivateUser(membershipId: string): Promise<UserDto | void> {
	const raw = await api.post<unknown>(`/v1/users/${membershipId}/reactivate`);
	return parseUserOrVoid(raw);
}

export async function unlockUser(membershipId: string): Promise<UserDto | void> {
	const raw = await api.post<unknown>(`/v1/users/${membershipId}/unlock`);
	return parseUserOrVoid(raw);
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

export { listRoles } from '$features/roles/api';
