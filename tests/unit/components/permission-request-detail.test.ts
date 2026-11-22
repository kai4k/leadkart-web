import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { ValidationError } from '$api/errors';

const req = {
	id: 'r1',
	state: 'pending',
	permission: 'crm.leads.reassign',
	duration_days: 30,
	reason: 'needed',
	requester_membership_id: 'someone-else',
	created_at: '2026-01-01T00:00:00Z'
};
const m = vi.hoisted(() => ({
	approve: { mutate: vi.fn(), error: null as unknown, isPending: false },
	deny: { mutate: vi.fn(), error: null as unknown, isPending: false }
}));
vi.mock('$features/permission-requests/queries', () => ({
	permissionRequestDetailQuery: () => ({
		isPending: false,
		isError: false,
		error: null,
		data: req
	}),
	permissionRequestQueueItemQuery: () => ({ data: { ...req, can_approve: true } }),
	approvePermissionRequestMutation: () => m.approve,
	denyPermissionRequestMutation: () => m.deny,
	cancelPermissionRequestMutation: () => ({ mutate: vi.fn(), error: null, isPending: false })
}));
vi.mock('$features/auth', () => ({ session: { principal: { membershipId: 'me' } } }));

import Detail from '#lib/features/permission-requests/components/PermissionRequestDetail.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	m.approve.error = null;
	m.deny.error = null;
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});
const render = () => {
	component = mount(Detail, { target, props: { id: 'r1' } });
	flushSync();
};
const box = (name: string) =>
	target.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`)!;

describe('a refused decision says where, on the textarea that was submitted', () => {
	it('decision_reason on deny marks the deny box, not the approval note', () => {
		m.deny.error = new ValidationError({ decision_reason: 'invalid_characters' }, 422);
		render();
		expect(box('deny_reason').getAttribute('aria-invalid')).toBe('true');
		expect(box('approval_note').getAttribute('aria-invalid')).toBeNull();
		expect(target.textContent).toContain('Remove line breaks, tabs and invisible characters.');
		expect(target.textContent).not.toContain('Check the highlighted fields.');
	});

	it('decision_reason on approve marks the approval note', () => {
		m.approve.error = new ValidationError({ decision_reason: 'too_long' }, 422);
		render();
		expect(box('approval_note').getAttribute('aria-invalid')).toBe('true');
		expect(box('deny_reason').getAttribute('aria-invalid')).toBeNull();
		expect(target.textContent).toContain('This is too long.');
	});

	it('a refusal naming no rendered field is one banner line, never "Check the highlighted fields."', () => {
		m.deny.error = new ValidationError({ duration_days: 'required' }, 422);
		render();
		expect(target.querySelector('[aria-invalid="true"]')).toBeNull();
		expect(target.textContent).not.toContain('Check the highlighted fields.');
		expect(target.querySelector('[data-slot="alert"]')?.textContent).toContain(
			'The request was not accepted. Check the values and try again.'
		);
	});
});
