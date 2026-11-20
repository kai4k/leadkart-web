/**
 * TanStack Query mutations over the two context flows in `service.ts`. A mutation gives the
 * caller isPending and one toast for a failure through the global MutationCache handler.
 */
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { enterTenantContext, exitTenantContext } from './service';
import type { EnterScopeRequest } from './api';

export function enterScopeMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({
		mutationFn: (req: EnterScopeRequest) => enterTenantContext(qc, req.slug)
	}));
}

export function exitScopeMutation() {
	const qc = useQueryClient();
	return createMutation(() => ({ mutationFn: () => exitTenantContext(qc) }));
}
