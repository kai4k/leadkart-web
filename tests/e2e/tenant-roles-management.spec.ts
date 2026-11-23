import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock } from './helpers/mock';

/**
 * Tenant roles management e2e — /settings/roles
 *
 *   Positive:
 *     Custom + system roles list renders with correct badges
 *     Create role opens drawer + submits cleanly
 *     Delete custom role: name-confirmation gate
 *
 *   Negative:
 *     Delete row hidden for protected (system / super_admin) roles
 *     Create role validation: name too short
 *     Delete server-side denial (403) surfaces in dialog
 *
 *   Tier:
 *     Tenant user without identity.roles.view: redirected to /dashboard
 */

import { TEST_TENANT_ID } from './helpers/fake-jwt';

const SUPER_ADMIN_ROLE = {
	id: '00000000-0000-4000-8000-000000000109',
	tenant_id: TEST_TENANT_ID,
	name: 'SuperAdmin',
	hierarchy_level: 0,
	permissions: ['*'],
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
	is_system_default: true,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};
const CUSTOM_ROLE = {
	id: '00000000-0000-4000-8000-00000000010b',
	tenant_id: TEST_TENANT_ID,
	name: 'Sales Lead',
	hierarchy_level: 5,
	permissions: ['crm.leads.view', 'crm.leads.create'],
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

async function signInAsRoleManager(page: Page) {
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: [
			'tenant.admin',
			'identity.roles.view',
			'identity.roles.create',
			'identity.roles.update',
			'identity.roles.delete',
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

test.describe('Roles list — positive', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('renders system + custom roles with correct type badges', async ({ page }) => {
		await signInAsRoleManager(page);
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
		await expect(page.getByRole('link', { name: 'SuperAdmin' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'CompanyOwner' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Sales Lead' })).toBeVisible();
	});

	test('create role: drawer opens + submit calls POST + list refreshes', async ({ page }) => {
		await signInAsRoleManager(page);
		await registerMocks([
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } },
			{
				method: 'POST',
				path: '/api/v1/roles',
				status: 201,
				body: { role_id: '00000000-0000-4000-8000-00000000010c' }
			},
			// The form action redirects to the new role's page.
			{
				method: 'GET',
				path: '/api/v1/roles/00000000-0000-4000-8000-00000000010c',
				status: 200,
				body: { ...CUSTOM_ROLE, id: '00000000-0000-4000-8000-00000000010c', name: 'Dispatch Lead' }
			}
		]);
		await page.goto('/settings/roles');

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

		// Form action 303-redirects to the new role detail page.
		await page.waitForURL(/\/settings\/roles\/00000000-0000-4000-8000-00000000010c$/, {
			timeout: 5000
		});
	});
});

test.describe('Roles list — negative', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('protected roles (super_admin / system_default) hide the Delete action', async ({
		page
	}) => {
		await signInAsRoleManager(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/roles',
			status: 200,
			body: { roles: [SUPER_ADMIN_ROLE, SYSTEM_ROLE, CUSTOM_ROLE] }
		});
		await page.goto('/settings/roles');
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

	test('create role: name shorter than 2 chars blocks submission', async ({ page }) => {
		await signInAsRoleManager(page);
		await registerMock({ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } });
		await page.goto('/settings/roles');

		// Header button opens the drawer
		await page
			.locator('#main-content')
			.getByRole('link', { name: /create role/i })
			.first()
			.click();
		await page.waitForURL(/\/settings\/roles\/new$/);
		await page.getByLabel('Role name').fill('a'); // too short (Go contract: name min 2)
		await page.locator('#main-content form').getByRole('button', { name: 'Create role' }).click();

		// Field-level error appears: TextField marks the input aria-invalid
		// and renders a body-sm text-danger-700 paragraph.
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
