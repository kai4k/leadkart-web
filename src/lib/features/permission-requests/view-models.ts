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

/** A pending request the caller did not submit: the only kind they can have a say over. */
export function canDecide(req: PermissionRequestDto, callerMembershipId: string): boolean {
	return req.state === 'pending' && req.requester_membership_id !== callerMembershipId;
}

/**
 * The decision controls, from the server's answer and nothing else (no permission or rank logic in
 * the browser). Go returns a request's detail only to its requester or to someone who may deny it, so
 * a pending request the caller did not submit, that they can read at all, may be denied: Deny needs
 * no queue scan. Approve is the one that does: `queued` is the request as the approver queue lists
 * it (`null` = not listed, `undefined` = not known yet) and its `can_approve` says whether approving
 * it as asked would pass.
 */
export function decisionControls(
	req: PermissionRequestDto,
	callerMembershipId: string,
	queued: PermissionRequestDto | null | undefined
): { canDeny: boolean; canApprove: boolean } {
	const canDeny = canDecide(req, callerMembershipId);
	return { canDeny, canApprove: canDeny && queued?.can_approve === true };
}

export function daysOrIndefinite(durationDays: number): string {
	if (durationDays <= 0) return 'Indefinite';
	if (durationDays === 1) return '1 day';
	return `${durationDays} days`;
}
