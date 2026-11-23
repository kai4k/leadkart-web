/**
 * The Manager, Permission-overrides and Role-assignment sheets on the real components and real mutation machinery:
 * their fields, what each sends, and the caller's own 403 / 404 / 409 lines. Parity with the sheets they replaced.
 * No field of these three forms has a validator, so validation on blur has nothing to say: a blur stays silent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({
	qc: undefined as unknown as QueryClient,
	held: [] as string[]
}));
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc,
		{},
		{ swallowRejections: true }
	)
);
vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn(), invalidate: vi.fn() }));
vi.mock('#lib/api/capabilities-refresh.ts', () => ({ refreshCapabilities: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock
}));
// The auth barrel also exports form components that need SvelteKit's form runtime.
vi.mock('$features/auth', async () => {
	const { displayName, initials } = await import('#lib/utils/person-name.ts');
	const { ACTION } = await import('#lib/features/auth/permissions.ts');
	return {
		displayName,
		initials,
		ACTION,
		session: { canAny: (...perms: string[]) => perms.some((p) => h.held.includes(p)) }
	};
});
const gw = vi.hoisted(() => ({
	assignManager: vi.fn(),
	removeManager: vi.fn(),
	replacePermissionOverrides: vi.fn(),
	assignRole: vi.fn(),
	revokeRole: vi.fn()
}));
vi.mock('#lib/features/users/api.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));
vi.mock('#lib/features/users/api', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));

import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createQueryClient } from '#lib/api/query-client.ts';
import en from '../../../src/lib/i18n/locales/en.json';
import {
	ApiError,
	AuthError,
	ConflictError,
	NotFoundError,
	ValidationError
} from '#lib/api/errors.ts';
import { ACTION } from '#lib/features/auth/permissions.ts';
import ManagerSelectorDrawer from '#lib/features/users/components/ManagerSelectorDrawer.svelte';
import PermissionOverridesPanel from '#lib/features/users/components/PermissionOverridesPanel.svelte';
import RoleAssignmentDrawer from '#lib/features/users/components/RoleAssignmentDrawer.svelte';

const person = (n: number, over: Record<string, unknown> = {}) => ({
	membership_id: `m${n}`,
	person_id: `p${n}`,
	tenant_id: 't1',
	email: `user${n}@example.com`,
	first_name: `User${n}`,
	last_name: 'Test',
	status: 'active' as const,
	designation: '',
	department: '',
	status_message: '',
	role_ids: [] as string[],
	...over
});
const role = (id: string, name: string, over: Record<string, unknown> = {}) => ({
	id,
	name,
	is_system_default: false,
	...over
});

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const onOpenChange = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	h.held = [...ACTION.roleAssign, ...ACTION.roleRevoke];
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const tick = () => new Promise((r) => setTimeout(r, 20));
const banner = () => document.querySelector('[role="alert"]')?.textContent?.trim();
const press = (label: string) =>
	[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

describe('ManagerSelectorDrawer', () => {
	// Go's maySetManager: an ACTIVE member STRICTLY more senior (a lower level) than the subordinate.
	const levels = [
		{ id: 'r-user', hierarchy_level: 50 },
		{ id: 'r-lead', hierarchy_level: 25 },
		{ id: 'r-manager', hierarchy_level: 15 }
	];
	const users = [
		person(1, { reports_to: 'm2', role_ids: ['r-user'] }),
		person(2, { role_ids: ['r-manager'] }),
		person(3, { role_ids: ['r-lead'] }),
		person(4, { status: 'inactive', role_ids: ['r-manager'] }),
		person(5, { role_ids: ['r-user'] }), // a peer: Go refuses a lateral link
		person(6) // no role: the least senior rank
	];
	function open(user = users[0]!) {
		const props = reactiveProps<ComponentProps<typeof ManagerSelectorDrawer>>({
			open: true,
			user,
			userList: users as never,
			roleList: levels as never,
			onOpenChange
		});
		component = mount(ManagerSelectorDrawer, { target, props });
		flushSync();
	}
	const select = () => document.querySelector<HTMLSelectElement>('select[name="manager"]')!;
	const choose = (value: string) => {
		select().value = value;
		select().dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
	};
	const save = () => {
		document.querySelector<HTMLFormElement>('#manager-form')!.requestSubmit();
		flushSync();
	};

	it('offers "no manager" and only the ACTIVE members more senior than the user, and starts on the current manager', () => {
		open();
		// not m4 (inactive), not m5 (a peer), not m6 (no role), not the user
		expect([...select().options].map((o) => o.value)).toEqual(['', 'm2', 'm3']);
		expect(select().options[0]!.textContent).toBe('— No manager —');
		expect(select().value).toBe('m2');
		expect(document.body.textContent).toContain('Manager for User1 Test');
	});

	it('a team lead is offered the manager only: nobody at their own level or below', () => {
		open(users[2]);
		expect([...select().options].map((o) => o.value)).toEqual(['', 'm2']);
	});

	it('a manager who left stays visible, and saving without a change sends nothing', async () => {
		open(person(7, { reports_to: 'gone', role_ids: ['r-user'] }) as never);
		expect(select().value).toBe('gone');
		expect(select().selectedOptions[0]!.textContent).toBe(
			'Current manager (no longer an active member)'
		);
		save();
		await tick();
		expect(gw.assignManager).not.toHaveBeenCalled();
		expect(gw.removeManager).not.toHaveBeenCalled();
	});

	it('a current manager Go would no longer accept is named, not dropped', () => {
		open(person(8, { reports_to: 'm5', role_ids: ['r-user'] }) as never);
		expect(select().value).toBe('m5');
		expect(select().selectedOptions[0]!.textContent).toBe(
			'User5 Test (current, can no longer be assigned)'
		);
	});

	it('a blur says nothing: the form has no validator', () => {
		open();
		select().dispatchEvent(new FocusEvent('blur'));
		flushSync();
		expect(select().getAttribute('aria-invalid')).not.toBe('true');
		expect(banner()).toBeUndefined();
	});

	it('Save with another manager sends { manager_id } for this membership, then closes', async () => {
		gw.assignManager.mockResolvedValue(undefined);
		open();
		choose('m3');
		save();
		await vi.waitFor(() => expect(gw.assignManager).toHaveBeenCalledTimes(1));
		expect(gw.assignManager).toHaveBeenCalledWith('m1', { manager_id: 'm3' });
		expect(gw.removeManager).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	it('choosing "no manager" for a user who has one removes it', async () => {
		gw.removeManager.mockResolvedValue(undefined);
		open();
		choose('');
		save();
		await vi.waitFor(() => expect(gw.removeManager).toHaveBeenCalledWith('m1'));
		expect(gw.assignManager).not.toHaveBeenCalled();
	});

	it('"no manager" for a user who has none sends nothing', async () => {
		open(users[1]);
		save();
		await tick();
		expect(gw.assignManager).not.toHaveBeenCalled();
		expect(gw.removeManager).not.toHaveBeenCalled();
	});

	it.each([
		['403', () => new AuthError(403), "You don't have permission to change this user's manager."],
		['404', () => new NotFoundError('/v1/users/m1/manager'), 'This user was deleted or moved.'],
		['409', () => new ConflictError(), 'This manager assignment conflicts with an existing one.']
	])('a %s answer is the sheet`s own banner line', async (_s, make, line) => {
		gw.assignManager.mockRejectedValue(make());
		open();
		choose('m3');
		save();
		await vi.waitFor(() => expect(banner()).toBe(line));
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	it('a field error on manager_id lands on the one field the form has', async () => {
		gw.assignManager.mockRejectedValue(new ValidationError({ manager_id: 'required' }, 422));
		open();
		choose('m3');
		save();
		await vi.waitFor(() => expect(select().getAttribute('aria-invalid')).toBe('true'));
	});
});

describe('PermissionOverridesPanel', () => {
	function open() {
		const props = reactiveProps<ComponentProps<typeof PermissionOverridesPanel>>({
			open: true,
			user: person(1) as never,
			onOpenChange
		});
		component = mount(PermissionOverridesPanel, { target, props });
		flushSync();
	}
	const tags = () => [
		...document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])')
	];
	const addTag = (input: HTMLInputElement, text: string) => {
		input.focus();
		input.value = text;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
		);
		flushSync();
	};
	const save = () => {
		document.querySelector<HTMLFormElement>('#permission-overrides-form')!.requestSubmit();
		flushSync();
	};

	it('has the two tag fields, the title and the submit label', () => {
		open();
		expect(document.body.textContent).toContain('Permission overrides for User1 Test');
		expect(document.body.textContent).toContain('Extra grants');
		expect(document.body.textContent).toContain('Revocations');
		expect(press('Apply overrides')).toBeTruthy();
		expect(tags().length).toBeGreaterThanOrEqual(2);
	});

	it('sends the exact set of grants and revokes for this membership', async () => {
		gw.replacePermissionOverrides.mockResolvedValue(undefined);
		open();
		const [grants, revokes] = tags();
		addTag(grants!, 'crm.leads.reassign');
		addTag(revokes!, 'crm.leads.delete');
		save();
		await vi.waitFor(() => expect(gw.replacePermissionOverrides).toHaveBeenCalledTimes(1));
		expect(gw.replacePermissionOverrides).toHaveBeenCalledWith('m1', {
			granted: ['crm.leads.reassign'],
			revoked: ['crm.leads.delete']
		});
	});

	it('empty lists are a valid submit: they clear the overlay', async () => {
		gw.replacePermissionOverrides.mockResolvedValue(undefined);
		open();
		save();
		await vi.waitFor(() =>
			expect(gw.replacePermissionOverrides).toHaveBeenCalledWith('m1', { granted: [], revoked: [] })
		);
	});

	it.each([
		['403', () => new AuthError(403), "You don't have permission to manage permission overrides."],
		[
			'404',
			() => new NotFoundError('/v1/users/m1/permission-overrides'),
			'This user was deleted or moved.'
		],
		['409', () => new ConflictError(), 'These overrides conflict with the current role set.']
	])('a %s answer is the sheet`s own banner line', async (_s, make, line) => {
		gw.replacePermissionOverrides.mockRejectedValue(make());
		open();
		save();
		await vi.waitFor(() => expect(banner()).toBe(line));
	});

	it('a refusal that names no field becomes one line on the grants field', async () => {
		gw.replacePermissionOverrides.mockRejectedValue(new ValidationError({}, 422));
		open();
		save();
		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(en.form.errors.permissionNamesInvalid)
		);
	});

	it('errors.revoked = [also_granted] reads as a sentence and names the permissions in both lists', async () => {
		gw.replacePermissionOverrides.mockRejectedValue(
			new ValidationError({ revoked: 'also_granted' }, 422)
		);
		open();
		const [grants, revokes] = tags();
		addTag(grants!, 'crm.leads.reassign');
		addTag(grants!, 'crm.leads.read');
		addTag(revokes!, 'crm.leads.reassign');
		save();
		await vi.waitFor(() =>
			expect(document.body.textContent).toContain(
				'A permission cannot be both granted and revoked.'
			)
		);
		expect(document.body.textContent).toContain(
			'Listed as both granted and revoked: crm.leads.reassign.'
		);
		expect(document.body.textContent).not.toContain('also_granted');
	});
});

describe('RoleAssignmentDrawer', () => {
	const roles = [
		role('r1', 'Sales'),
		role('r2', 'Admin', { is_system_default: true, is_super_admin: true }),
		role('r3', 'Support')
	];
	function open(user = person(1, { role_ids: ['r1', 'r2'] })) {
		const props = reactiveProps<ComponentProps<typeof RoleAssignmentDrawer>>({
			open: true,
			user: user as never,
			roleList: roles as never,
			onOpenChange
		});
		component = mount(RoleAssignmentDrawer, { target, props });
		flushSync();
	}
	const list = (name: string) =>
		[...document.querySelectorAll(`ul[aria-label="${name}"] li`)].map((li) => li.textContent);

	it('lists the assigned and the available roles for this member', () => {
		open();
		expect(document.body.textContent).toContain('Roles for User1 Test');
		expect(list('Assigned roles')).toHaveLength(2);
		expect(list('Available roles')).toHaveLength(1);
		expect(list('Available roles')[0]).toContain('Support');
		expect(list('Assigned roles').join()).toContain('System');
	});

	it('Assign sends the role for this membership', async () => {
		gw.assignRole.mockResolvedValue(undefined);
		open();
		press('Assign').click();
		await vi.waitFor(() => expect(gw.assignRole).toHaveBeenCalledWith('m1', { role_id: 'r3' }));
	});

	it('Revoke sends the role; the system default role is Protected, with no button', async () => {
		gw.revokeRole.mockResolvedValue(undefined);
		open();
		expect(document.body.textContent).toContain('Protected');
		expect(
			[...document.querySelectorAll('button')].filter((b) => b.textContent?.includes('Revoke'))
		).toHaveLength(1);
		press('Revoke').click();
		await vi.waitFor(() => expect(gw.revokeRole).toHaveBeenCalledWith('m1', 'r1'));
	});

	it('without the permissions, neither Assign nor Revoke is offered', () => {
		h.held = [];
		open();
		expect(
			[...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Assign'))
		).toBe(false);
		expect(
			[...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Revoke'))
		).toBe(false);
	});

	it.each([
		['403', () => new AuthError(403), "You don't have permission to assign roles."],
		['404', () => new NotFoundError('/v1/users/m1/roles'), 'This role or user no longer exists.'],
		['409', () => new ConflictError(), 'This role is already assigned.']
	])('an assign answered %s shows its own line', async (_s, make, line) => {
		gw.assignRole.mockRejectedValue(make());
		open();
		press('Assign').click();
		await vi.waitFor(() => expect(document.body.textContent).toContain(line));
	});

	it.each([
		['403', () => new AuthError(403), "You don't have permission to revoke roles."],
		[
			'409',
			() => new ConflictError(),
			"This role can't be revoked while it's the user's last permission source."
		]
	])('a revoke answered %s shows its own line', async (_s, make, line) => {
		gw.revokeRole.mockRejectedValue(make());
		open();
		press('Revoke').click();
		await vi.waitFor(() => expect(document.body.textContent).toContain(line));
	});

	it('an error with no status line falls back to a sentence that names the action', async () => {
		gw.assignRole.mockRejectedValue(new ApiError(500));
		open();
		press('Assign').click();
		await vi.waitFor(() => expect(document.querySelector('[role="alert"]')).not.toBeNull());
	});
});
