/**
 * The ONE BFF call that ends operator tenant scope (DELETE /api/operator/scope
 * clears the `lk_op_tenant` cookie), shared by the operator feature's exit service and the
 * global session guard, which lives in `lib/api` and so cannot import features.
 *
 * Entering or leaving a tenant context changes what the (app) layout load answers
 * (`inTenantContext`, and with it the nav, the guards and the permission subtraction), but no
 * navigation re-runs that load by itself: the layout declares `depends(SCOPE_DEPENDENCY)` and
 * every enter / exit invalidates it. Nothing else may change the scope cookie from the browser.
 */
import { invalidate } from '$app/navigation';
import { clearPrivateCaches } from '#lib/utils/private-caches.ts';
import { api } from './client';
import { SCOPE_DEPENDENCY } from './scope-header.ts';

/** Re-run the (app) layout load: capabilities context, nav and guards follow the scope cookie. */
export function refreshTenantContext(): Promise<void> {
	return invalidate(SCOPE_DEPENDENCY);
}

export async function exitOperatorScope(): Promise<void> {
	await api.delete('/operator/scope');
	// Another tenant's context starts next: drop offline copies of this one.
	await clearPrivateCaches();
	await refreshTenantContext();
}
