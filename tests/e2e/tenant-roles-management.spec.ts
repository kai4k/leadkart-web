import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
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
 *     list with type badges, create role, Delete hidden for protected roles, name too short,
 *     Delete refused with role_in_use shows who still holds the role
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
	permissions: ['crm.leads.view', 'crm.leads.create'],
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
async function enterAcmeRoles(page: Page, roles: unknown[]) {
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.tenants.view', 'platform.tenants.manage', 'platform.roles.manage'],
		is_super_user: true,
		tenant_id: TEST_TENANT_ID,
		tenant_slug: TEST_TENANT_SLUG
	});
	await registerMocks([
		{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: `/api/v1/tenants/${ACME.id}`, status: 200, body: ACME },
		{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [ACME] } },
		{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
		{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles } },
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

	test('a role opens read-only: nothing can be saved', async ({ page }) => {
		await signInAsCompanyAdmin(page);
		await registerMocks([
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [CUSTOM_ROLE] } },
			{ method: 'GET', path: `/api/v1/roles/${CUSTOM_ROLE.id}`, status: 200, body: CUSTOM_ROLE }
		]);
		await page.goto(`/settings/roles/${CUSTOM_ROLE.id}`);
		await expect(page.getByText('Hierarchy level 5')).toBeVisible();
		await expect(page.getByText(READ_ONLY_LINE)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Save permissions' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Save parent' })).toBeDisabled();
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

		// In a tenant context there is no role detail page: the action goes back to the company's roles.
		await page.waitForURL(/\/operator\/scope\/roles$/, { timeout: 5000 });
		const posted = (await listMockCalls()).filter(
			(c) => c.method === 'POST' && c.path === '/api/v1/roles'
		);
		expect(posted).toHaveLength(1);
		expect(JSON.parse(posted[0].body)).toMatchObject({ name: 'Dispatch Lead', hierarchy_level: 6 });
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
