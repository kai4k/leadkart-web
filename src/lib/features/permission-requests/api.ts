/**
 * Gateway for permission-elevation requests (ADR 0055). Go answers
 * approve / deny / cancel with 204 and create with 201 + ids.
 */
import { api } from '#lib/api/client.ts';
import { cursorQuery, toPage, type CursorParams, type Page } from '#lib/api/pagination.ts';
import {
	listPermissionRequestsResponseSchema,
	permissionRequestDtoSchema,
	createPermissionRequestResponseSchema,
	type CreatePermissionRequest,
	type CreatePermissionRequestResponse,
	type PermissionRequestDto
} from './schemas';

export type ListRole = 'requester' | 'approver';

export interface ListParams extends CursorParams {
	role?: ListRole;
}

export async function listPermissionRequests(
	params: ListParams = {},
	signal?: AbortSignal
): Promise<Page<PermissionRequestDto>> {
	return toPage(
		await api.get('/v1/permission-requests', listPermissionRequestsResponseSchema, {
			query: { role: params.role, ...cursorQuery(params) },
			signal
		}),
		'requests'
	);
}

/** Pages the approver queue may span before the search gives up (100 requests a page). */
const MAX_QUEUE_PAGES = 10;

/**
 * The request as the caller's approver queue lists it, or null when it is not listed. `can_approve`
 * is present only on the queue, so this is how the detail page learns what Go says the caller may do.
 */
export async function findInApproverQueue(
	id: string,
	signal?: AbortSignal
): Promise<PermissionRequestDto | null> {
	let cursor: string | undefined;
	for (let i = 0; i < MAX_QUEUE_PAGES; i += 1) {
		const page = await listPermissionRequests({ role: 'approver', cursor, page_size: 100 }, signal);
		const hit = page.items.find((r) => r.id === id);
		if (hit) return hit;
		if (!page.has_more || !page.next_cursor) return null;
		cursor = page.next_cursor;
	}
	return null;
}

export function getPermissionRequest(
	id: string,
	signal?: AbortSignal
): Promise<PermissionRequestDto> {
	return api.get(`/v1/permission-requests/${id}`, permissionRequestDtoSchema, { signal });
}

export function createPermissionRequest(
	req: CreatePermissionRequest
): Promise<CreatePermissionRequestResponse> {
	return api.postJson('/v1/permission-requests', req, createPermissionRequestResponseSchema);
}

export async function approvePermissionRequest(
	id: string,
	body: { decision_reason?: string } = {}
): Promise<void> {
	await api.post(`/v1/permission-requests/${id}/approve`, body);
}

export async function denyPermissionRequest(
	id: string,
	body: { decision_reason: string }
): Promise<void> {
	await api.post(`/v1/permission-requests/${id}/deny`, body);
}

export async function cancelPermissionRequest(id: string): Promise<void> {
	await api.post(`/v1/permission-requests/${id}/cancel`, {});
}
