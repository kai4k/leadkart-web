/**
 * The identity screens say only what is true today:
 *   - "Sign out other devices" (Go keeps the session of the access token, `except_current`); a table of devices;
 *   - changing email to the address the account already has is a field error, before anything is sent;
 *   - the permission-overrides action is not offered while a save would erase the member's existing overrides.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

type SubmitInput = { formElement: HTMLFormElement; cancel: () => void };
const h = vi.hoisted(() => ({
	submit: undefined as ((input: SubmitInput) => unknown) | undefined,
	revokeOthers: undefined as unknown as (vars: unknown) => void,
	held: [] as string[]
}));
vi.mock('$app/forms', () => ({
	enhance: (_form: HTMLFormElement, submit?: (input: SubmitInput) => unknown) => {
		h.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/navigation', () => ({
	goto: async () => {},
	invalidate: async () => {},
	beforeNavigate: () => {}
}));
vi.mock('$app/state', () => ({
	page: {
		form: null,
		url: new URL('http://localhost/'),
		data: {
			scopeContext: 'fp',
			capabilities: {
				email: 'Asha@Acme.test',
				get effective_permissions() {
					return h.held;
				}
			}
		}
	}
}));
vi.mock('$features/auth/queries', () => ({
	mySessionsQuery: () => ({
		data: [
			{ family_id: 'f1', device_label: 'Chrome', last_used_at: null, created_at: null },
			{ family_id: 'f2', device_label: 'Phone', last_used_at: null, created_at: null }
		],
		isPending: false
	}),
	revokeSessionMutation: () => ({ mutate: vi.fn(), isPending: false }),
	revokeOtherSessionsMutation: () => ({
		mutate: (vars: unknown) => h.revokeOthers(vars),
		isPending: false
	})
}));

import SessionsList from '#lib/features/auth/components/SessionsList.svelte';
import ChangeEmailForm from '#lib/features/auth/components/ChangeEmailForm.svelte';
import { createMemberPermissions } from '#lib/features/users/member-permissions.svelte.ts';
import { ACTION } from '#lib/features/auth/permissions.ts';
import en from '#lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	h.submit = undefined;
	h.revokeOthers = vi.fn();
	h.held = [];
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

describe('SessionsList', () => {
	it('the button says "Sign out other devices" and promises this device stays signed in', () => {
		component = mount(SessionsList, { target });
		flushSync();
		const button = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Sign out other devices')
		)!;
		expect(button).toBeDefined();
		expect(target.textContent).not.toContain('Sign out everywhere');
		const note = document.getElementById(button.getAttribute('aria-describedby')!)!;
		expect(note.textContent).toContain('This device stays signed in');
		expect(note.textContent).not.toContain('this device included');
		button.click();
		expect(h.revokeOthers).toHaveBeenCalledTimes(1);
	});

	it('the sessions are a table named "Active sessions", one row per device, each with its own named Revoke', () => {
		component = mount(SessionsList, { target });
		flushSync();
		expect(target.querySelector('table caption')?.textContent).toContain('Active sessions');
		expect(target.querySelectorAll('tbody tr')).toHaveLength(2);
		expect(target.querySelector('button[aria-label="Revoke session Chrome"]')).not.toBeNull();
		expect(target.querySelector('button[aria-label="Revoke session Phone"]')).not.toBeNull();
	});
});

describe('ChangeEmailForm', () => {
	const input = () => target.querySelector<HTMLInputElement>('input[name="new_email"]')!;
	const submitWith = (email: string) => {
		input().value = email;
		input().dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		const cancel = vi.fn();
		h.submit?.({ formElement: target.querySelector('form')!, cancel });
		flushSync();
		return cancel;
	};
	beforeEach(() => {
		component = mount(ChangeEmailForm, { target });
		flushSync();
	});

	it('the address the account already has is a field error and nothing is sent (Go would answer "sent" and send nothing)', () => {
		// compared as Go compares: trimmed, lower-case
		const cancel = submitWith('  asha@acme.TEST ');
		expect(cancel).toHaveBeenCalled();
		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(target.textContent).toContain(en.auth.changeEmail.errors.sameAsCurrent);
	});

	it('another address goes through', () => {
		const cancel = submitWith('asha.k@acme.test');
		expect(cancel).not.toHaveBeenCalled();
		expect(input().getAttribute('aria-invalid')).toBeNull();
	});
});

describe('member permissions', () => {
	it('permission overrides are not offered, even to a caller who holds the route permission', () => {
		h.held = [...ACTION.userOverrides, ...ACTION.roleAssign];
		const may = createMemberPermissions();
		expect(may.manageRoles).toBe(true);
		expect(may.overrides).toBe(false);
	});
});
