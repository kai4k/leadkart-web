import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { settleForScan } from './helpers/settle';
import { listMockCalls, resetMock, registerMocks, registerMock } from './helpers/mock';

/**
 * Roles e2e — /settings/roles (a company) and /operator/scope/roles (LeadKart operator)
 *
 * Roles are LeadKart platform authority (owner ruling 2026-11-25, Go ADR 0073 addendum): a company admin
 * sees the roles read-only; only an operator acting inside the company creates, edits and deletes.
 *
 *   Company admin:
 *     the list is read-only (no Create role, no Delete, one quiet line), the create page is closed
 *   Operator in scope:
 *     list with type badges, create role (lands on the role page), edit a role (rename, permissions),
 *     Delete hidden for protected roles, Delete succeeds (one deactivate, row leaves, no refetch),
 *     name too short, Delete refused with role_in_use shows who still holds the role (inside the
 *     alert), a later different refusal drops that line, a view-only operator sees no edit controls
 *   Tier:
 *     Tenant user without identity.roles.view: redirected to /dashboard
 */

import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from './helpers/fake-jwt';

const READ_ONLY_LINE = 'Roles are set up by LeadKart. Contact support to add or change a role.';

const SUPER_ADMIN_ROLE = {
	id: '00000000-0000-4000-8000-000000000109',
	tenant_id: TEST_TENANT_ID,
	name: 'SuperAdmin',
	hierarchy_level: 0,
	permissions: ['*'],
	is_active: true,
	is_system_default: false,
	is_super_admin: true,
	created_at: '2026-01-01T00:00:00Z'
};
const SYSTEM_ROLE = {
	id: '00000000-0000-4000-8000-00000000010a',
	tenant_id: TEST_TENANT_ID,
	name: 'CompanyOwner',
	hierarchy_level: 1,
	permissions: ['tenant.admin'],
	is_active: true,
	is_system_default: true,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};
const CUSTOM_ROLE = {
	id: '00000000-0000-4000-8000-00000000010b',
	tenant_id: TEST_TENANT_ID,
	name: 'Sales Lead',
	hierarchy_level: 5,
	permissions: ['crm.leads.read', 'crm.leads.manage'],
	is_active: true,
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

const ACME = fakeTenantDto({
	id: '00000000-0000-4000-8000-0000000000a1',
	slug: 'acme-pharma',
	display_name: 'Acme Pharma',
	legal_name: 'Acme Pharma Pvt Ltd'
});

/** A company administrator: tenant.admin plus what a company may hold (view, assign), never role writes. */
async function signInAsCompanyAdmin(page: Page) {
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: [
			'tenant.admin',
			'identity.roles.view',
			'identity.roles.assign',
			'identity.users.view'
		]
	});
	// RolesList also queries users (for member count). Empty list keeps it simple.
	await registerMock({
		method: 'GET',
		path: '/api/v1/users',
		status: 200,
		body: { users: [], has_more: false }
	});
}

/** A LeadKart operator acting inside Acme (the scope cookie is set by clicking the company), on its roles. */
async function enterAcmeRoles(
	page: Page,
	roles: unknown[],
	who: { superUser?: boolean; permissions?: string[] } = {}
) {
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: who.permissions ?? [
			'platform.tenants.view',
			'platform.tenants.manage',
			'platform.roles.manage'
		],
		is_super_user: who.superUser ?? true,
		tenant_id: TEST_TENANT_ID,
		tenant_slug: TEST_TENANT_SLUG
	});
	await registerMocks([
		{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: `/api/v1/tenants/${ACME.id}`, status: 200, body: ACME },
		{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
		{
			method: 'GET',
			path: '/api/v1/roles',
			status: 200,
			body: { roles, status_counts: { active: roles.length, inactive: 0 } }
		},
		{
			method: 'GET',
			path: `/api/v1/tenants/${ACME.id}/audit/events`,
			status: 200,
			body: { events: [], has_more: false }
		}
	]);
	await page.goto('/operator/tenants');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
	await page.getByText('Acme Pharma').first().click();
	await page.waitForURL(/\/operator\/scope\/profile$/);
	await page.goto('/operator/scope/roles');
}

/** Opens a row's menu, picks Delete and types the role's name: the dialog, ready to confirm. */
async function openDelete(page: Page, name: string) {
	await page
		.locator(`tr:has-text("${name}") button[aria-label="Actions for ${name}"]`)
		.first()
		.click();
	await page.getByText('Delete', { exact: true }).click();
	const dialog = page.getByRole('alertdialog');
	await dialog.getByRole('textbox').fill(name);
	return dialog;
}

async function axe(page: Page, scope: string) {
	await settleForScan(page);
	const r = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
		.include(scope)
		.analyze();
	const blocking = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
	expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

const HOLDERS_LINE = '2 people hold this role: Asha Rao, Ravi Shah.';
const IN_USE = {
	error: 'role_in_use',
	holders: 2,
	holder_names: ['Asha Rao', 'Ravi Shah']
};

const gets = async (path: string) =>
	(await listMockCalls()).filter((c) => c.method === 'GET' && c.path === path).length;

test.describe('Roles: a company admin sees them read-only', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('no Create role, no Delete; one quiet line says who sets roles up', async ({ page }) => {
		await signInAsCompanyAdmin(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/roles',
			status: 200,
			body: { roles: [SUPER_ADMIN_ROLE, SYSTEM_ROLE, CUSTOM_ROLE] }
		});
		await page.goto('/settings/roles');

		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: 'Roles' })
		).toBeVisible();
		await expect(page.getByRole('link', { name: 'Sales Lead' })).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toBeVisible();
		await expect(page.getByRole('link', { name: /create role/i })).toHaveCount(0);

		await page
			.locator('tr:has-text("Sales Lead") button[aria-label="Actions for Sales Lead"]')
			.first()
			.click();
		await expect(page.getByText('View', { exact: true })).toBeVisible({ timeout: 3000 });
		await expect(page.getByText('Delete', { exact: true })).toHaveCount(0);
		await expect(page.getByText('Edit', { exact: true })).toHaveCount(0);
	});

	test('the create page is closed', async ({ page }) => {
		await signInAsCompanyAdmin(page);
		await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
		await page.goto('/settings/roles/new');
		await page.waitForURL((url) => !url.pathname.endsWith('/settings/roles/new'));
	});

	test('a role opens read-only: its details as text, no editors, no save buttons', async ({
		page
	}) => {
		await signInAsCompanyAdmin(page);
		await registerMocks([
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [CUSTOM_ROLE] } },
			{ method: 'GET', path: `/api/v1/roles/${CUSTOM_ROLE.id}`, status: 200, body: CUSTOM_ROLE }
		]);
		await page.goto(`/settings/roles/${CUSTOM_ROLE.id}`);
		await expect(page.getByText('Hierarchy level 5')).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toBeVisible();
		// the role as it is: name, level and the permissions it grants
		await expect(page.getByText('crm.leads.read', { exact: true })).toBeVisible();
		await expect(page.getByText('crm.leads.manage', { exact: true })).toBeVisible();
		// nothing to operate: no fields, no pickers, no save buttons (not even disabled ones)
		await expect(page.locator('#main-content input, #main-content select')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /^save/i })).toHaveCount(0);
		await expect(page.getByRole('checkbox')).toHaveCount(0);
	});

	test('a11y: the read-only role page', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await signInAsCompanyAdmin(page);
		await registerMocks([
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [CUSTOM_ROLE] } },
			{ method: 'GET', path: `/api/v1/roles/${CUSTOM_ROLE.id}`, status: 200, body: CUSTOM_ROLE }
		]);
		await page.goto(`/settings/roles/${CUSTOM_ROLE.id}`);
		await expect(page.getByText('Hierarchy level 5')).toBeVisible();
		await axe(page, '#main-content');
	});
});

test.describe('Roles: a LeadKart operator inside a company', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('renders system + custom roles with correct type badges', async ({ page }) => {
		await enterAcmeRoles(page, [SUPER_ADMIN_ROLE, SYSTEM_ROLE, CUSTOM_ROLE]);

		await expect(
			page.locator('#main-content').getByRole('heading', { level: 2, name: 'Roles' })
		).toBeVisible();
		await expect(page.getByRole('link', { name: 'SuperAdmin' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'CompanyOwner' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Sales Lead' })).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toHaveCount(0);
	});

	test('create role: the form posts and returns to the roles of the company', async ({ page }) => {
		await enterAcmeRoles(page, []);
		await registerMock({
			method: 'POST',
			path: '/api/v1/roles',
			status: 201,
			body: { role_id: '00000000-0000-4000-8000-00000000010c' }
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/roles/00000000-0000-4000-8000-00000000010c',
			status: 200,
			body: { ...CUSTOM_ROLE, id: '00000000-0000-4000-8000-00000000010c', name: 'Dispatch Lead' }
		});

		await page
			.locator('#main-content')
			.getByRole('link', { name: /create role/i })
			.first()
			.click();
		await page.waitForURL(/\/settings\/roles\/new$/);
		await expect(page.getByRole('heading', { level: 1, name: 'Create role' })).toBeVisible();

		await page.getByLabel('Role name').fill('Dispatch Lead');
		await page.getByLabel(/hierarchy level/i).fill('6');
		await page.locator('#main-content form').getByRole('button', { name: 'Create role' }).click();

		// The action lands on the role's page in the scope tree (the own-tenant page is closed in a tenant context).
		await page.waitForURL(/\/operator\/scope\/roles\/00000000-0000-4000-8000-00000000010c$/, {
			timeout: 5000
		});
		const posted = (await listMockCalls()).filter(
			(c) => c.method === 'POST' && c.path === '/api/v1/roles'
		);
		expect(posted).toHaveLength(1);
		expect(JSON.parse(posted[0].body)).toMatchObject({ name: 'Dispatch Lead', hierarchy_level: 6 });
		await expect(page.getByRole('button', { name: 'Save permissions' })).toBeVisible();
	});

	test('protected roles (super_admin / system_default) hide the Delete action', async ({
		page
	}) => {
		await enterAcmeRoles(page, [SUPER_ADMIN_ROLE, SYSTEM_ROLE, CUSTOM_ROLE]);
		await expect(page.getByRole('link', { name: 'SuperAdmin' })).toBeVisible();

		// DataTable renders responsive twin copies (desktop tr + mobile
		// card). Scope to the desktop <tr> by row text. The trigger inside
		// that scope is unique per row.
		const customRowTrigger = page
			.locator('tr:has-text("Sales Lead") button[aria-label="Actions for Sales Lead"]')
			.first();
		await customRowTrigger.click();
		await expect(page.getByText('Delete', { exact: true })).toBeVisible({ timeout: 3000 });
		await page.keyboard.press('Escape');

		const superAdminRowTrigger = page
			.locator('tr:has-text("SuperAdmin") button[aria-label="Actions for SuperAdmin"]')
			.first();
		await superAdminRowTrigger.click();
		await expect(page.getByText('Edit', { exact: true })).toBeVisible({ timeout: 3000 });
		await expect(page.getByText('Delete', { exact: true })).toHaveCount(0);
	});

	test('Delete refused while people hold the role: says who still does', async ({ page }) => {
		await enterAcmeRoles(page, [CUSTOM_ROLE]);
		await registerMock({
			method: 'POST',
			path: `/api/v1/roles/${CUSTOM_ROLE.id}/deactivate`,
			status: 409,
			body: {
				error: 'role_in_use',
				holders: 7,
				holder_names: ['Asha Rao', 'Ravi Shah', 'Meena Iyer', 'Kabir Das', 'Nina Paul'],
				errors: { active_holders: ['6'] }
			}
		});

		await page
			.locator('tr:has-text("Sales Lead") button[aria-label="Actions for Sales Lead"]')
			.first()
			.click();
		await page.getByText('Delete', { exact: true }).click();
		const dialog = page.getByRole('alertdialog');
		await dialog.getByRole('textbox').fill('Sales Lead');
		await dialog.getByRole('button', { name: 'Delete role' }).click();

		await expect(
			dialog.getByText('People still hold this role. Remove it from them first.')
		).toBeVisible();
		// the holders line is part of the alert: announced with it, in reading order
		await expect(
			dialog
				.getByRole('alert')
				.getByText(
					'7 people hold this role: Asha Rao, Ravi Shah, Meena Iyer, Kabir Das, Nina Paul and 2 more.'
				)
		).toBeVisible();
	});

	test('a later, different refusal in the same dialog drops the holders line of the first', async ({
		page
	}) => {
		await enterAcmeRoles(page, [CUSTOM_ROLE]);
		await registerMocks([
			{
				method: 'POST',
				path: `/api/v1/roles/${CUSTOM_ROLE.id}/deactivate`,
				status: 403,
				body: { error: 'insufficient_rank' }
			},
			{
				method: 'POST',
				path: `/api/v1/roles/${CUSTOM_ROLE.id}/deactivate`,
				status: 409,
				body: IN_USE,
				times: 1
			}
		]);
		const dialog = await openDelete(page, 'Sales Lead');
		await dialog.getByRole('button', { name: 'Delete role' }).click();
		await expect(dialog.getByText(HOLDERS_LINE)).toBeVisible();
		await dialog.getByRole('button', { name: 'Delete role' }).click();
		await expect(
			dialog.getByText('You can only do this for people and roles below your own level.')
		).toBeVisible();
		await expect(dialog.getByText(HOLDERS_LINE)).toHaveCount(0);
		await expect(
			dialog.getByText('People still hold this role. Remove it from them first.')
		).toHaveCount(0);
	});

	test('a11y: the scope roles list and the dialog showing a role_in_use refusal', async ({
		page
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await enterAcmeRoles(page, [CUSTOM_ROLE]);
		await expect(page.getByRole('link', { name: 'Sales Lead' })).toBeVisible();
		await axe(page, '#main-content');
		await registerMock({
			method: 'POST',
			path: `/api/v1/roles/${CUSTOM_ROLE.id}/deactivate`,
			status: 409,
			body: IN_USE
		});
		const dialog = await openDelete(page, 'Sales Lead');
		await dialog.getByRole('button', { name: 'Delete role' }).click();
		await expect(dialog.getByRole('alert').getByText(HOLDERS_LINE)).toBeVisible();
		await axe(page, '[role="alertdialog"]');
	});

	test('an operator who may only view roles sees no edit controls and no "contact support" line', async ({
		page
	}) => {
		await enterAcmeRoles(page, [CUSTOM_ROLE], {
			superUser: false,
			permissions: ['platform.tenants.view', 'platform.roles.view']
		});
		await registerMock({
			method: 'GET',
			path: `/api/v1/roles/${CUSTOM_ROLE.id}`,
			status: 200,
			body: CUSTOM_ROLE
		});
		await expect(page.getByRole('link', { name: 'Sales Lead' })).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toHaveCount(0);
		await expect(page.getByRole('link', { name: /create role/i })).toHaveCount(0);
		await page.getByRole('link', { name: 'Sales Lead' }).click();
		await page.waitForURL(new RegExp(`/operator/scope/roles/${CUSTOM_ROLE.id}$`));
		await expect(page.getByText('Hierarchy level 5')).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toHaveCount(0);
		await expect(page.getByText('crm.leads.read', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: /^save/i })).toHaveCount(0);
	});

	for (const superUser of [true, false]) {
		test(`Delete succeeds (${superUser ? 'super user' : 'platform.roles.manage'}): one deactivate under the company, the row leaves, a toast, no refetch of the list`, async ({
			page
		}) => {
			const other = {
				...CUSTOM_ROLE,
				id: '00000000-0000-4000-8000-00000000010d',
				name: 'Dispatch Lead'
			};
			await enterAcmeRoles(page, [CUSTOM_ROLE, other], { superUser });
			await expect(page.getByRole('link', { name: 'Sales Lead' })).toBeVisible();
			await registerMock({
				method: 'POST',
				path: `/api/v1/roles/${CUSTOM_ROLE.id}/deactivate`,
				status: 200,
				body: { ...CUSTOM_ROLE, is_active: false }
			});
			const before = await gets('/api/v1/roles');
			const dialog = await openDelete(page, 'Sales Lead');
			await dialog.getByRole('button', { name: 'Delete role' }).click();
			await expect(dialog).toBeHidden();
			await expect(page.getByRole('link', { name: 'Sales Lead' })).toHaveCount(0);
			await expect(page.getByRole('link', { name: 'Dispatch Lead' })).toBeVisible();
			await expect(page.getByText('Role deleted')).toBeVisible();
			const posts = (await listMockCalls()).filter(
				(c) => c.method === 'POST' && c.path.endsWith('/deactivate')
			);
			expect(posts).toHaveLength(1);
			expect(posts[0]!['x-tenant-id']).toBe(ACME.id);
			await page.waitForTimeout(500);
			expect(await gets('/api/v1/roles')).toBe(before);
		});
	}

	test('edit: the operator opens a role from the list, renames it and saves its permissions, both under the company', async ({
		page
	}) => {
		await enterAcmeRoles(page, [CUSTOM_ROLE]);
		await registerMocks([
			{ method: 'GET', path: `/api/v1/roles/${CUSTOM_ROLE.id}`, status: 200, body: CUSTOM_ROLE },
			{ method: 'PATCH', path: `/api/v1/roles/${CUSTOM_ROLE.id}`, status: 204 },
			{
				method: 'PUT',
				path: `/api/v1/roles/${CUSTOM_ROLE.id}/permissions`,
				status: 204
			}
		]);

		// the row's Edit item goes to the scope page (the own-tenant one is closed in a tenant context)
		await page
			.locator('tr:has-text("Sales Lead") button[aria-label="Actions for Sales Lead"]')
			.first()
			.click();
		await page.getByText('Edit', { exact: true }).click();
		await page.waitForURL(new RegExp(`/operator/scope/roles/${CUSTOM_ROLE.id}$`));
		await expect(page.getByText('Hierarchy level 5')).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toHaveCount(0);

		await page.getByLabel('Name').fill('Sales Head');
		await page.getByRole('button', { name: 'Save properties' }).click();
		await expect(page.getByText('Saved.')).toBeVisible();

		await page.getByRole('checkbox', { name: 'crm.leads.assign', exact: true }).check();
		await page.getByRole('button', { name: 'Save permissions' }).click();

		await expect
			.poll(
				async () =>
					(await listMockCalls()).filter(
						(c) => c.method === 'PUT' && c.path.endsWith('/permissions')
					).length
			)
			.toBe(1);
		const calls = await listMockCalls();
		const patch = calls.find(
			(c) => c.method === 'PATCH' && c.path === `/api/v1/roles/${CUSTOM_ROLE.id}`
		)!;
		const put = calls.find((c) => c.method === 'PUT' && c.path.endsWith('/permissions'))!;
		expect(patch['x-tenant-id']).toBe(ACME.id);
		expect(put['x-tenant-id']).toBe(ACME.id);
		expect(JSON.parse(patch.body)).toMatchObject({ name: 'Sales Head' });
		expect(JSON.parse(put.body).permissions).toContain('crm.leads.assign');
	});

	test('a11y: the operator role page', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await enterAcmeRoles(page, [CUSTOM_ROLE]);
		await registerMock({
			method: 'GET',
			path: `/api/v1/roles/${CUSTOM_ROLE.id}`,
			status: 200,
			body: CUSTOM_ROLE
		});
		await page.goto(`/operator/scope/roles/${CUSTOM_ROLE.id}`);
		await expect(page.getByText('Hierarchy level 5')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save permissions' })).toBeVisible();
		await axe(page, '#main-content');
	});

	test('create role: name shorter than 2 chars blocks submission', async ({ page }) => {
		await enterAcmeRoles(page, []);

		await page
			.locator('#main-content')
			.getByRole('link', { name: /create role/i })
			.first()
			.click();
		await page.waitForURL(/\/settings\/roles\/new$/);
		await page.getByLabel('Role name').fill('a'); // too short (Go contract: name min 2)
		await page.locator('#main-content form').getByRole('button', { name: 'Create role' }).click();

		await expect(page.locator('input[aria-invalid="true"]').first()).toBeVisible({
			timeout: 3000
		});
	});
});

test.describe('Roles tier guard', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('tenant user without identity.roles.view redirected away from /settings/roles', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await page.goto('/settings/roles');
		// +page.server.ts requireCapability redirects to /dashboard
		await page.waitForURL(/\/dashboard$/);
	});
});
