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
 * UX, error funneling through onError, and uniform toast semantics with
 * the rest of the operator surface.
 */
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
import { toast } from '$ui';
import { AuthError, NetworkError, NotFoundError } from '$api/errors';
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
			await invalidateAll();
			await goto(resolve('/operator/scope/profile'));
		},
		onError: (err) => {
			if (err instanceof NetworkError) {
				toast.error('Check your network connection and try again.');
			} else if (err instanceof AuthError) {
				toast.error(
					err.status === 403
						? "You don't have permission to open this tenant."
						: 'Your session expired. Sign in again.'
				);
			} else if (err instanceof NotFoundError) {
				toast.error('This tenant was deleted or moved.');
			} else {
				toast.error('Could not open tenant');
			}
		}
	}));
}

/**
 * Exit tenant scope: DELETE cookie → clear cache → invalidate loads →
 * navigate back to /operator/tenants. Failures stay-in-scope and toast.
 */
export function exitScopeMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: () => api.exitScope(),
		onSuccess: async () => {
			qc.clear();
			await invalidateAll();
			await goto(resolve('/operator/tenants'));
		},
		onError: () => {
			toast.error('Could not exit scope — try again.');
		}
	}));
}
