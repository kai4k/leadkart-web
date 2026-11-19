/**
 * TanStack Query mutation hooks for entering / exiting operator scope.
 *
 * The mutation owns the error → toast mapping, the cache invalidation,
 * and the navigation side-effect — keeping the calling component a
 * pure click → mutation.mutate() handoff (CLAUDE.md Gateway → Service
 * → Component layering).
 *
 * Why mutations (not just imperative gateway calls): the operator-list
 * row click is a write (sets the lk_op_tenant cookie) + a navigation +
 * a cache wipe. Wrapping it in createMutation gives consistent isPending
 * UX, errors toast once through the global MutationCache handler.
 */
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { goto, refreshAll } from '$app/navigation';
import { resolve } from '$app/paths';
import * as api from './api';
import type { EnterScopeRequest } from './api';

/**
 * Enter tenant scope: POST slug → BFF resolves + sets cookie → clear
 * TanStack cache (previous scope's queries are no longer authoritative)
 * → invalidate all SvelteKit loads → navigate to /operator/scope/profile.
 *
 * The URL never carries the tenant slug; the cookie does.
 */
export function enterScopeMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: EnterScopeRequest) => api.enterScope(req),
		onSuccess: async () => {
			qc.clear();
			await refreshAll();
			await goto(resolve('operator/scope/profile'));
		}
	}));
}

/**
 * Exit tenant scope: DELETE cookie → clear cache → invalidate loads →
 * navigate back to /operator/tenants. Failures stay in scope (the global handler toasts).
 */
export function exitScopeMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: () => api.exitScope(),
		onSuccess: async () => {
			qc.clear();
			await refreshAll();
			await goto(resolve('operator/tenants'));
		}
	}));
}
