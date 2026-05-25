/**
 * Pure view-model helpers for permission requests.
 */
import type { PermissionRequestDto, PermissionRequestState } from './schemas';

export interface StateBadge {
	label: string;
	variant: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
}

const STATE_BADGES: Record<PermissionRequestState, StateBadge> = {
	pending: { label: 'Pending', variant: 'warning' },
	approved: { label: 'Approved', variant: 'success' },
	denied: { label: 'Denied', variant: 'danger' },
	cancelled: { label: 'Cancelled', variant: 'neutral' }
};

export function stateBadge(state: PermissionRequestState): StateBadge {
	return STATE_BADGES[state] ?? { label: state, variant: 'info' };
}

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
