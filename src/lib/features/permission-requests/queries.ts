/**
 * TanStack Query hooks for permission-elevation requests.
 *
 * Two list scopes:
 *   role=requester (default) — the caller's own history
 *   role=approver           — the caller's approval queue
 */
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import * as api from './api';
import { toast } from '$ui';
import type { CreatePermissionRequest } from './schemas';
import type { ListRole } from './api';

export const permissionRequestsKeys = {
	all: ['permission-requests'] as const,
	list: (role: ListRole = 'requester') => [...permissionRequestsKeys.all, 'list', role] as const,
	detail: (id: string) => [...permissionRequestsKeys.all, 'detail', id] as const
};

export function permissionRequestsListQuery(role: ListRole = 'requester') {
	return createQuery(() => ({
		queryKey: permissionRequestsKeys.list(role),
		queryFn: () => api.listPermissionRequests({ role })
	}));
}

export function permissionRequestDetailQuery(id: string) {
	return createQuery(() => ({
		queryKey: permissionRequestsKeys.detail(id),
		queryFn: () => api.getPermissionRequest(id),
		enabled: !!id
	}));
}

export function createPermissionRequestMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: CreatePermissionRequest) => api.createPermissionRequest(req),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: permissionRequestsKeys.all });
			toast('success', 'Request submitted');
		}
	}));
}

export function approvePermissionRequestMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, decision_reason }: { id: string; decision_reason?: string }) =>
			api.approvePermissionRequest(id, decision_reason ? { decision_reason } : {}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: permissionRequestsKeys.all });
			toast('success', 'Request approved');
		}
	}));
}

export function denyPermissionRequestMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ id, decision_reason }: { id: string; decision_reason: string }) =>
			api.denyPermissionRequest(id, { decision_reason }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: permissionRequestsKeys.all });
			toast('success', 'Request denied');
		}
	}));
}

export function cancelPermissionRequestMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (id: string) => api.cancelPermissionRequest(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: permissionRequestsKeys.all });
			toast('success', 'Request cancelled');
		}
	}));
}
