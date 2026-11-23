/**
 * Gateway layer for tenant user management. Tenant scope is the caller's
 * JWT tenant_id — no tenant_id parameter on any call. Go answers every
 * mutation here with 204 (or 201 + ids for create), so mutations return void.
 */
import { seg } from '#lib/utils/path-segment.ts';
import { api } from '#lib/api/client.ts';
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
	searchMembersResponseSchema,
	type SearchMembersResponseDto
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

/** Which members `GET /v1/users` lists: Go's `?status=` (active is its default). */
export type UserStatusFilter = 'active' | 'inactive' | 'all';
export const USER_STATUS_FILTERS: readonly UserStatusFilter[] = ['active', 'inactive', 'all'];
/** The whole tenant's member counts by status, sent with the first page whatever `status` is. */
export interface UserStatusCounts {
	active: number;
	inactive: number;
}
export interface UsersRead extends AllPages<UserDto> {
	/** From the first page; absent when Go did not send it. */
	counts?: UserStatusCounts;
}

/** GET /v1/users — one cursor page of the members with `status` (default active). The first page carries `status_counts`. */
async function readUsersPage(
	p: CursorParams,
	status: UserStatusFilter,
	signal?: AbortSignal
): Promise<{ page: Page<UserDto>; counts?: UserStatusCounts }> {
	const envelope = await api.get('/v1/users', listUsersResponseSchema, {
		query: { ...cursorQuery(p), status: status === 'active' ? undefined : status },
		signal
	});
	const counts = envelope.status_counts;
	return {
		page: toPage(envelope, 'users'),
		counts: counts ? { active: counts.active, inactive: counts.inactive } : undefined
	};
}

export async function listUsersPage(
	p: CursorParams,
	signal?: AbortSignal,
	status: UserStatusFilter = 'active'
): Promise<Page<UserDto>> {
	return (await readUsersPage(p, status, signal)).page;
}

/**
 * Every member with `status`, following next_cursor (the directory has no server-side search), and the
 * first page's counts for the status chips. `truncated` = the page cap stopped the read.
 */
export async function listAllUsers(
	status: UserStatusFilter = 'active',
	signal?: AbortSignal
): Promise<UsersRead> {
	let counts: UserStatusCounts | undefined;
	const all = await fetchAllPages(
		async (cursor) => {
			const read = await readUsersPage({ cursor, page_size: MAX_PAGE_SIZE }, status, signal);
			if (cursor === undefined) counts = read.counts;
			return read.page;
		},
		{ signal }
	);
	return { ...all, counts };
}

export function getUser(membershipId: string, signal?: AbortSignal): Promise<UserDto> {
	return api.get(`/v1/users/${seg(membershipId)}`, userDtoSchema, { signal });
}

export function createUser(req: CreateUserRequest): Promise<CreateUserResponse> {
	return api.postJson('/v1/users', req, createUserResponseSchema);
}

export async function deactivateUser(
	membershipId: string,
	body: DeactivateUserRequest
): Promise<void> {
	await api.post(`/v1/users/${seg(membershipId)}/deactivate`, body);
}

export async function reactivateUser(membershipId: string): Promise<void> {
	await api.post(`/v1/users/${seg(membershipId)}/reactivate`);
}

export async function assignRole(membershipId: string, body: AssignUserRoleRequest): Promise<void> {
	await api.post(`/v1/users/${seg(membershipId)}/roles`, body);
}

export async function revokeRole(membershipId: string, roleId: string): Promise<void> {
	await api.delete(`/v1/users/${seg(membershipId)}/roles/${seg(roleId)}`);
}

export async function replacePermissionOverrides(
	membershipId: string,
	body: ReplacePermissionOverridesRequest
): Promise<void> {
	await api.patch(`/v1/users/${seg(membershipId)}/permission-overrides`, body);
}

export async function assignManager(
	membershipId: string,
	body: AssignManagerRequest
): Promise<void> {
	await api.put(`/v1/users/${seg(membershipId)}/manager`, body);
}

export async function removeManager(membershipId: string): Promise<void> {
	await api.delete(`/v1/users/${seg(membershipId)}/manager`);
}

/**
 * The member picker (`GET /v1/users/search`, needs crm.leads.assign): ACTIVE members of the effective company
 * whose name contains `q` (2 to 100 characters), best first, at most 20. A hit is `membership_id`,
 * `display_name` and `designation` only: no email, no person id. An empty match is 200 with `members: []`.
 */
export const MEMBER_SEARCH_MIN = 2;
export const MEMBER_SEARCH_MAX = 100;
/** Go measures the text in characters, trimmed: one emoji is one. */
export function memberSearchReady(q: string): boolean {
	const n = [...q.trim()].length;
	return n >= MEMBER_SEARCH_MIN && n <= MEMBER_SEARCH_MAX;
}
export function searchMembers(q: string, signal?: AbortSignal): Promise<SearchMembersResponseDto> {
	return api.get('/v1/users/search', searchMembersResponseSchema, {
		query: { q: q.trim(), limit: 20 },
		signal
	});
}
