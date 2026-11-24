/**
 * Nobody is deleted: a member's page names an inactive manager and lists inactive reports with their status.
 * The page therefore reads the roster with `status=all` (the manager PICKER still offers active members only).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';

const user = (id: string, first: string, over: Record<string, unknown> = {}) => ({
	membership_id: id,
	person_id: `p-${id}`,
	tenant_id: 't1',
	email: `${first}@example.com`,
	first_name: first,
	last_name: 'T',
	status: 'active',
	designation: '',
	department: '',
	status_message: '',
	role_ids: [],
	joined_at: '2026-01-01T00:00:00Z',
	...over
});
const h = vi.hoisted(() => ({
	asked: [] as string[],
	roster: [] as unknown[],
	detail: undefined as unknown
}));

vi.mock('$app/state', () => ({
	page: { params: { id: 'asha' }, url: new URL('http://localhost/settings/users/asha?tab=reports') }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), beforeNavigate: vi.fn(), invalidate: vi.fn() }));
vi.mock('#lib/features/users/queries.ts', () => ({
	userDetailQuery: () => ({
		get data() {
			return h.detail;
		},
		isPending: false,
		isError: false,
		error: null
	}),
	usersListQuery: (_enabled: () => boolean, getStatus?: () => string) => ({
		get data() {
			h.asked.push(getStatus ? getStatus() : 'active');
			return h.roster;
		},
		isPending: false,
		isError: false
	}),
	reactivateUserMutation: () => ({ mutate: vi.fn() }),
	removeManagerMutation: () => ({ mutate: vi.fn(), isPending: false })
}));
vi.mock('#lib/features/roles/index.ts', () => ({
	rolesListQuery: () => ({ data: { roles: [] }, isPending: false })
}));
vi.mock('#lib/features/users/index.ts', async () => {
	const stub = (await import('../stubs/Empty.svelte')).default;
	const tabs = (await import('#lib/features/users/components/UserDetailTabs.svelte')).default;
	return {
		DeactivateUserDialog: stub,
		RoleAssignmentDrawer: stub,
		ManagerSelectorDrawer: stub,
		PermissionOverridesPanel: stub,
		UserDetailTabs: tabs,
		createMemberPermissions: () => ({
			manageRoles: false,
			update: false,
			overrides: false,
			deactivate: false,
			reactivate: false
		})
	};
});
vi.mock('#lib/features/auth/view-models.ts', async () => ({
	...(await import('#lib/features/auth/view-models.ts')),
	displayName: (u: { first_name: string }) => u.first_name
}));
vi.mock('#lib/features/auth/index.ts', async () => {
	const vm = await import('#lib/features/auth/view-models.ts');
	const { ACTION } = await import('#lib/features/auth/permissions.ts');
	return {
		...vm,
		ACTION,
		session: { canAny: () => false },
		displayName: (u: { first_name: string }) => u.first_name
	};
});

import Page from '../../../src/routes/(app)/settings/users/[id]/+page.svelte';

let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
	h.asked = [];
});

describe('a member page keeps inactive people visible', () => {
	it('reads the roster with status=all, shows the inactive manager by name and the inactive report with its status', () => {
		h.detail = user('asha', 'Asha', { reports_to: 'nina' });
		h.roster = [
			user('asha', 'Asha', { reports_to: 'nina' }),
			user('nina', 'Nina', { status: 'inactive' }),
			user('ravi', 'Ravi', { reports_to: 'asha' }),
			user('mohan', 'Mohan', { reports_to: 'asha', status: 'inactive' })
		];
		component = mount(Page, { target: document.body });
		flushSync();
		expect(h.asked).toContain('all');
		const text = document.body.textContent ?? '';
		expect(text).toContain('Ravi');
		expect(text).toContain('Mohan');
		expect(text).toMatch(/Mohan[\s\S]*Inactive/);
		expect(text).toContain('2 members report directly');
	});
});
