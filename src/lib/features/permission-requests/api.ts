/**
 * Gateway for permission-elevation requests (ADR 0055).
 * All responses are Zod-parsed at the boundary.
 */
import { api, parseResponse } from '$api/client';
import {
	listPermissionRequestsResponseSchema,
	permissionRequestDtoSchema,
	createPermissionRequestResponseSchema,
	type CreatePermissionRequest,
	type CreatePermissionRequestResponse,
	type ListPermissionRequestsResponse,
	type PermissionRequestDto
} from './schemas';

export type ListRole = 'requester' | 'approver';

export interface ListParams {
	role?: ListRole;
	cursor?: string;
	limit?: number;
}

function buildListQuery(params: ListParams = {}): string {
	const qs = new URLSearchParams();
	if (params.role) qs.set('role', params.role);
	if (params.cursor) qs.set('cursor', params.cursor);
	if (params.limit != null) qs.set('limit', String(params.limit));
	const q = qs.toString();
	return q ? `/v1/permission-requests?${q}` : '/v1/permission-requests';
}

export async function listPermissionRequests(
	params?: ListParams
): Promise<ListPermissionRequestsResponse> {
	const raw = await api.get<unknown>(buildListQuery(params));
	return parseResponse(listPermissionRequestsResponseSchema, raw);
}

export async function getPermissionRequest(id: string): Promise<PermissionRequestDto> {
	const raw = await api.get<unknown>(`/v1/permission-requests/${id}`);
	return parseResponse(permissionRequestDtoSchema, raw);
}

export async function createPermissionRequest(
	req: CreatePermissionRequest
): Promise<CreatePermissionRequestResponse> {
	const raw = await api.post<unknown>('/v1/permission-requests', req);
	return parseResponse(createPermissionRequestResponseSchema, raw);
}

export async function approvePermissionRequest(
	id: string,
	body: { decision_reason?: string } = {}
): Promise<void> {
	await api.post<void>(`/v1/permission-requests/${id}/approve`, body);
}

export async function denyPermissionRequest(
	id: string,
	body: { decision_reason: string }
): Promise<void> {
	await api.post<void>(`/v1/permission-requests/${id}/deny`, body);
}

export async function cancelPermissionRequest(id: string): Promise<void> {
	await api.post<void>(`/v1/permission-requests/${id}/cancel`, {});
}
