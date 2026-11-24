/**
 * Roles list and permission-request list on the shared DataTable: a row opens through a real link in its
 * first cell (never a clickable row), and the request list's tabs live in `?role=` through useUrlTab.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

const h = vi.hoisted(() => ({
	role: '' as string,
	asked: [] as string[],
	requests: [] as unknown[],
	roles: [] as unknown[]
}));

vi.mock('$app/state', async () => {
	const { createReactiveUrlPage } = await import('../helpers/reactive-page.svelte.ts');
	return { page: createReactiveUrlPage(new URL('http://localhost/permission-requests')) };
});
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	goto: vi.fn(() => Promise.resolve())
}));
vi.mock('#lib/features/permission-requests/queries.ts', () => ({
	permissionRequestsInfiniteQuery: (getRole: () => string) => ({
		get items() {
			h.asked.push(getRole());
			return h.requests;
		},
		get state() {
			return h.requests.length === 0 ? 'empty' : 'ready';
		},
		query: { isPending: false, isError: false, error: null },
		hasNextPage: false,
		isFetchingNextPage: false,
		sentinelRef: null,
		rootRef: null,
		error: null,
		loadMore: vi.fn()
	})
}));
vi.mock('#lib/features/roles/queries.ts', () => ({
	rolesListQuery: () => ({
		get data() {
			return { roles: h.roles };
		},
		isPending: false,
		isError: false,
		error: null
	})
}));
vi.mock('#lib/features/auth/index.ts', async () => {
	const { ACTION } = await import('#lib/features/auth/permissions.ts');
	return { ACTION, session: { canAny: () => true, can: () => true } };
});
vi.mock('#lib/features/roles/role-permissions.svelte.ts', () => ({
	createRolePermissions: () => ({ create: true, update: true, delete: true })
}));
vi.mock('#lib/features/roles/components/DeleteRoleDialog.svelte', async () => ({
	default: (await import('../stubs/Empty.svelte')).default
}));
vi.mock(
	'#lib/features/permission-requests/components/CreatePermissionRequestDrawer.svelte',
	async () => ({
		default: (await import('../stubs/Empty.svelte')).default
	})
);

import PermissionRequestsList from '#lib/features/permission-requests/components/PermissionRequestsList.svelte';
import RolesList from '#lib/features/roles/components/RolesList.svelte';
import { page } from '$app/state';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	h.asked = [];
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});
function openRequests(query = '') {
	(page as unknown as { url: URL }).url = new URL(`http://localhost/permission-requests${query}`);
	component = mount(PermissionRequestsList, { target });
	flushSync();
}

const request = {
	id: 'r1',
	state: 'pending',
	permission: 'crm.leads.reassign',
	duration_days: 30,
	reason: 'needed',
	requester_membership_id: 'someone',
	created_at: '2026-01-01T00:00:00Z'
};

describe('PermissionRequestsList', () => {
	it('a request opens through a link in its first cell; the row itself is not clickable', () => {
		h.requests = [request];
		openRequests();
		const link = target.querySelector<HTMLAnchorElement>('tbody a')!;
		expect(link.textContent).toContain('crm.leads.reassign');
		expect(link.getAttribute('href')).toContain('permission-requests');
		expect(target.querySelector('tbody tr')!.getAttribute('onclick')).toBeNull();
	});

	it('the tabs are the Tabs primitive over ?role=: requester by default, approver by the URL, junk is requester', () => {
		h.requests = [request];
		openRequests();
		expect(h.asked.at(-1)).toBe('requester');
		const tab = (name: string) =>
			[...target.querySelectorAll('[role="tab"]')].find((t) => t.textContent?.trim() === name)!;
		expect(tab('My requests').getAttribute('aria-selected')).toBe('true');
		unmount(component!);
		openRequests('?role=approver');
		expect(h.asked.at(-1)).toBe('approver');
		expect(tab('Awaiting my decision').getAttribute('aria-selected')).toBe('true');
		unmount(component!);
		openRequests('?role=nonsense');
		expect(h.asked.at(-1)).toBe('requester');
	});

	it('an empty approver inbox says Inbox zero', () => {
		h.requests = [];
		openRequests('?role=approver');
		expect(target.textContent).toContain('Inbox zero');
	});
});

describe('RolesList', () => {
	const role = {
		id: 'role1',
		name: 'Sales Lead',
		permissions: ['crm.leads.view'],
		hierarchy_level: 30,
		is_system_default: false,
		is_super_admin: false
	};
	it('a role opens through a link in its name cell, and its menu is named for the role', () => {
		h.roles = [role];
		component = mount(RolesList, { target, props: { roster: null } });
		flushSync();
		const link = target.querySelector<HTMLAnchorElement>('tbody a')!;
		expect(link.textContent).toContain('Sales Lead');
		expect(link.getAttribute('href')).toContain('settings/roles');
		expect(target.querySelector('button[aria-label="Actions for Sales Lead"]')).not.toBeNull();
	});

	it('no roles: the empty state, not an empty table', () => {
		h.roles = [];
		component = mount(RolesList, { target, props: { roster: null } });
		flushSync();
		expect(target.textContent).toContain('No roles yet');
	});
});
