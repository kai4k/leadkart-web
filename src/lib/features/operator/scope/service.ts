/**
 * Entering and leaving an operator's tenant context: THE two flows, used by the tenants list,
 * the command palette, the scope layout (the session guard shares the exit through
 * `leaveTenantContext`). Each: change the scope cookie through the BFF, then follow it with
 * `followScopeChange` (drop what nothing shows, re-run the (app) layout load, reset what is
 * mounted, tell the other tabs; the order is documented there) and navigate. The URL never
 * carries the tenant slug; the cookie does.
 */
import type { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { followScopeChange } from '$api/operator-scope';
import * as api from './api';

export async function enterTenantContext(qc: QueryClient, slug: string): Promise<void> {
	await api.enterScope({ slug });
	await followScopeChange(qc);
	await goto(resolve('operator/scope/profile'));
}

export async function exitTenantContext(qc: QueryClient): Promise<void> {
	await api.exitScope();
	await followScopeChange(qc);
	await goto(resolve('operator/tenants'), { replace: true });
}
