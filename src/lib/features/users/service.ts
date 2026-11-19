/**
 * Orchestration for bulk member status changes. Go has no bulk endpoint, so each id is its
 * own call; every call is settled (one failure never hides the rest) and the outcome is
 * reported once, not per row.
 */
import * as api from './api';
import type { BulkStatusAction, BulkStatusResult } from './types';

const BULK_DEACTIVATE_REASON = 'Bulk deactivate';

/**
 * Runs the action for every id. Resolves with the counts when at least one call worked;
 * rethrows the first failure when none did (so the caller's error path reports it).
 */
export async function bulkSetStatus(
	action: BulkStatusAction,
	ids: readonly string[]
): Promise<BulkStatusResult> {
	if (ids.length === 0) return { succeeded: 0, failed: 0, failedIds: [] };
	const results = await Promise.allSettled(
		ids.map((id) =>
			action === 'deactivate'
				? api.deactivateUser(id, { reason: BULK_DEACTIVATE_REASON })
				: api.reactivateUser(id)
		)
	);
	const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
	if (failures.length > 0 && failures.length === results.length) throw failures[0].reason;
	return {
		succeeded: results.length - failures.length,
		failed: failures.length,
		failedIds: ids.filter((_, i) => results[i]?.status === 'rejected')
	};
}
