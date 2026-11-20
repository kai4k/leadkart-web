/**
 * Entering and leaving an operator's tenant context: THE two flows, used by the tenants list,
 * the command palette, the scope layout (the session guard shares the exit's BFF half through
 * `exitOperatorScope`). Each: change the scope cookie through the BFF, drop the previous
 * context's cached queries, re-run the (app) layout load (`inTenantContext`, nav, guards) and
 * navigate. The URL never carries the tenant slug; the cookie does.
 */
import type { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { refreshTenantContext } from '$api/operator-scope';
import * as api from './api';

export async function enterTenantContext(qc: QueryClient, slug: string): Promise<void> {
	await api.enterScope({ slug });
	qc.clear();
	await refreshTenantContext();
	await goto(resolve('operator/scope/profile'));
}

export async function exitTenantContext(qc: QueryClient): Promise<void> {
	await api.exitScope(); // includes the layout refresh
	qc.clear();
	await goto(resolve('operator/tenants'), { replace: true });
}
