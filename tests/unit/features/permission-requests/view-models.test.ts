import { describe, expect, it } from 'vitest';
import {
	decisionControls,
	permissionRequestState
} from '#lib/features/permission-requests/view-models.ts';

describe('permissionRequestState', () => {
	it.each([
		['pending', 'Pending', 'warning'],
		['approved', 'Approved', 'success'],
		['denied', 'Denied', 'danger'],
		['cancelled', 'Cancelled', 'neutral']
	] as const)('%s -> %s (%s)', (state, label, variant) => {
		expect(permissionRequestState(state)).toEqual({ label, variant });
	});

	it('an unknown state renders raw in a neutral badge', () => {
		expect(permissionRequestState('expired' as never)).toEqual({
			label: 'expired',
			variant: 'neutral'
		});
	});
});

describe("decisionControls (from the server's answer; no client-side rank logic)", () => {
	const req = (over: Record<string, unknown> = {}) =>
		({ id: 'r1', state: 'pending', requester_membership_id: 'someone-else', ...over }) as never;
	const queued = (can_approve: boolean) => ({ id: 'r1', can_approve }) as never;

	it('Deny for every pending request the caller did not submit (Go shows the detail only to the requester or someone who may deny); Approve only when the queue says can_approve', () => {
		expect(decisionControls(req(), 'me', queued(true))).toEqual({
			canDeny: true,
			canApprove: true
		});
		expect(decisionControls(req(), 'me', queued(false))).toEqual({
			canDeny: true,
			canApprove: false
		});
	});

	it('Deny needs no queue scan: the queue being unknown or not listing it removes Approve only', () => {
		expect(decisionControls(req(), 'me', null)).toEqual({ canDeny: true, canApprove: false });
		expect(decisionControls(req(), 'me', undefined)).toEqual({ canDeny: true, canApprove: false });
	});

	it("nothing for a settled request or the caller's own", () => {
		expect(decisionControls(req({ state: 'approved' }), 'me', queued(true))).toEqual({
			canDeny: false,
			canApprove: false
		});
		expect(decisionControls(req({ requester_membership_id: 'me' }), 'me', queued(true))).toEqual({
			canDeny: false,
			canApprove: false
		});
	});
});
