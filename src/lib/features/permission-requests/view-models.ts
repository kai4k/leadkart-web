/**
 * Pure view-model helpers for permission requests.
 */
import { defineStatusMap } from '#lib/utils/status.ts';
import type { PermissionRequestDto, PermissionRequestState } from './schemas';

export const permissionRequestState = defineStatusMap<PermissionRequestState>({
	pending: { label: 'Pending', variant: 'warning' },
	approved: { label: 'Approved', variant: 'success' },
	denied: { label: 'Denied', variant: 'danger' },
	cancelled: { label: 'Cancelled', variant: 'neutral' }
});

/** Caller can cancel only their own pending requests. */
export function canCancel(req: PermissionRequestDto, callerMembershipId: string): boolean {
	return req.state === 'pending' && req.requester_membership_id === callerMembershipId;
}

/** Approver can act only on pending requests they didn't submit. */
export function canDecide(req: PermissionRequestDto, callerMembershipId: string): boolean {
	return req.state === 'pending' && req.requester_membership_id !== callerMembershipId;
}

export function daysOrIndefinite(durationDays: number): string {
	if (durationDays <= 0) return 'Indefinite';
	if (durationDays === 1) return '1 day';
	return `${durationDays} days`;
}
