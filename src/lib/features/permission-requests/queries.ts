/**
 * TanStack Query hooks for permission-elevation requests.
 *
 * Two list scopes:
 *   role=requester (default) — the caller's own history
 *   role=approver           — the caller's approval queue
 */
import { createQuery } from '@tanstack/svelte-query';
import { createResourceMutation } from '#lib/api/mutations.ts';
import * as api from './api';
import type { CreatePermissionRequest } from './schemas';
import type { ListRole } from './api';

const permissionRequestsKeys = {
	all: ['permission-requests'] as const,
	list: (role: ListRole = 'requester') => [...permissionRequestsKeys.all, 'list', role] as const,
	detail: (id: string) => [...permissionRequestsKeys.all, 'detail', id] as const
};

export function permissionRequestsListQuery(role: ListRole = 'requester') {
	return createQuery(() => ({
		queryKey: permissionRequestsKeys.list(role),
		queryFn: ({ signal }) => api.listPermissionRequests({ role }, signal)
	}));
}

export function permissionRequestDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: permissionRequestsKeys.detail(id),
		queryFn: ({ signal }) => api.getPermissionRequest(id, signal),
		enabled: Boolean(id)
	}));
}

export function createPermissionRequestMutation() {
	return createResourceMutation({
		fn: (req: CreatePermissionRequest) => api.createPermissionRequest(req),
		invalidate: () => [permissionRequestsKeys.all],
		successToast: 'Request submitted',
		inlineErrors: true
	});
}

export function approvePermissionRequestMutation() {
	return createResourceMutation({
		fn: ({ id, decision_reason }: { id: string; decision_reason?: string }) =>
			api.approvePermissionRequest(id, decision_reason ? { decision_reason } : {}),
		invalidate: () => [permissionRequestsKeys.all],
		successToast: 'Request approved'
	});
}

export function denyPermissionRequestMutation() {
	return createResourceMutation({
		fn: ({ id, decision_reason }: { id: string; decision_reason: string }) =>
			api.denyPermissionRequest(id, { decision_reason }),
		invalidate: () => [permissionRequestsKeys.all],
		successToast: 'Request denied'
	});
}

export function cancelPermissionRequestMutation() {
	return createResourceMutation({
		fn: (id: string) => api.cancelPermissionRequest(id),
		invalidate: () => [permissionRequestsKeys.all],
		successToast: 'Request cancelled'
	});
}
