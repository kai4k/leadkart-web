/**
 * The ONE BFF call that ends operator tenant scope (DELETE /api/operator/scope
 * clears the `lk_op_tenant` cookie). Shared by the operator feature's
 * `exitScope` and the global session guard, which lives in `lib/api` and so
 * cannot import features.
 */
import { clearPrivateCaches } from '#lib/utils/private-caches.ts';
import { api } from './client';

export async function exitOperatorScope(): Promise<void> {
	await api.delete('/operator/scope');
	// Another tenant's context starts next: drop offline copies of this one.
	await clearPrivateCaches();
}
