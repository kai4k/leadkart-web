import { expect, test, type Page } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock } from './helpers/mock';
import { fakeUserDto, TEST_TENANT_ID, TEST_MEMBERSHIP_ID } from './helpers/fake-jwt';

/**
 * Tenant user management e2e — /settings/users
 *
 *   Positive:
 *     Empty state renders + Add member opens drawer
 *     Existing members render in the table
 *     Create user happy path
 *
 *   Negative:
 *     Create user with weak password: per-field error
 *     Create user with duplicate email: server 409 surfaces in banner
 *     List 500: surfaces as table error state
 *
 *   Tier:
 *     Operator without identity.users.view: redirected to /dashboard
 */

const OTHER_USER = fakeUserDto({
	membership_id: 'mem-aaa',
	person_id: 'per-aaa',
	tenant_id: TEST_TENANT_ID,
	email: 'alice@acme.test',
	first_name: 'Alice',
	last_name: 'Anderson',
	designation: 'Sales Lead',
	department: 'Sales'
});

async function signInAsTenantAdmin(page: Page) {
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: [
			'tenant.admin',
			'identity.users.view',
			'identity.users.manage',
			'identity.roles.view'
		]
	});
	await registerMock({
		method: 'GET',
		path: '/api/v1/roles',
		status: 200,
		body: { roles: [] }
	});
}

test.describe('Tenant user management — positive', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('empty state + Add member opens the drawer', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 200,
			body: { users: [] }
		});
		await page.goto('/settings/users');

		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: 'Team' })
		).toBeVisible();
		await expect(page.getByText(/no team members yet/i)).toBeVisible();
		// Header button. Use first() — EmptyState also renders an "Add member"
		// CTA that resolves to the same target.
		await page
			.locator('#main-content')
			.getByRole('button', { name: /add member/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: /add team member/i })).toBeVisible();
	});

	test('existing members render in the table', async ({ page }) => {
		await signInAsTenantAdmin(page);
		// Two members: the caller (TEST_MEMBERSHIP_ID, via signIn helper) plus alice
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 200,
			body: {
				users: [
					OTHER_USER,
					fakeUserDto({
						membership_id: TEST_MEMBERSHIP_ID,
						first_name: 'Test',
						last_name: 'User',
						email: 'test@example.com'
					})
				]
			}
		});
		await page.goto('/settings/users');
		await expect(page.getByText('Alice Anderson')).toBeVisible();
		await expect(page.getByText('alice@acme.test')).toBeVisible();
	});

	test('create member happy path: form → success → drawer closes', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMocks([
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } },
			{
				method: 'POST',
				path: '/api/v1/users',
				status: 201,
				body: {
					person_id: 'per-new',
					membership_id: 'mem-new',
					person_existed: false
				}
			}
		]);
		await page.goto('/settings/users');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /add member/i })
			.first()
			.click();

		await page.getByLabel(/^email/i).fill('newhire@acme.test');
		await page.getByLabel(/first name/i).fill('New');
		await page.getByLabel(/last name/i).fill('Hire');
		await page.getByLabel(/initial password/i).fill('Sup3rSecret!');
		await page.getByRole('button', { name: /create user/i }).click();

		// Success alert appears in the drawer (Member added.{personExisted ? ' …' : ''})
		await expect(page.getByText('Member added', { exact: true })).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Tenant user management — negative', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('create with weak password: per-field error stops submission', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 200,
			body: { users: [] }
		});
		await page.goto('/settings/users');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /add member/i })
			.first()
			.click();

		await page.getByLabel(/^email/i).fill('weak@acme.test');
		await page.getByLabel(/first name/i).fill('Weak');
		await page.getByLabel(/last name/i).fill('Pass');
		await page.getByLabel(/initial password/i).fill('short');
		await page.getByRole('button', { name: /create user/i }).click();

		// Zod schema rejects on submit; either inline field error or banner.
		// At least one error indicator must surface (no Create call happens).
		const errorRegion = page.locator('[role="alert"], .text-danger').first();
		await expect(errorRegion).toBeVisible({ timeout: 3000 });
	});

	test('duplicate email: server 409 surfaces in form banner', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMocks([
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } },
			{
				method: 'POST',
				path: '/api/v1/users',
				status: 409,
				body: {
					code: 'membership_exists',
					message: 'A membership already exists for this email in this tenant'
				}
			}
		]);
		await page.goto('/settings/users');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /add member/i })
			.first()
			.click();

		await page.getByLabel(/^email/i).fill('alice@acme.test');
		await page.getByLabel(/first name/i).fill('Alice');
		await page.getByLabel(/last name/i).fill('Dup');
		await page.getByLabel(/initial password/i).fill('Sup3rSecret!');
		await page.getByRole('button', { name: /create user/i }).click();

		// Error banner surfaces the 409 message
		await expect(page.getByText(/membership.*exists/i).first()).toBeVisible({ timeout: 5000 });
	});

	test('list 500: surfaces error in DataTable error state', async ({ page }) => {
		await signInAsTenantAdmin(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 500,
			body: { code: 'internal_error', message: 'user list lookup failed' }
		});
		await page.goto('/settings/users');
		// DataTable surfaces error state via aria role="alert" or table error message
		await expect(page.getByText(/failed|error/i).first()).toBeVisible({ timeout: 5000 });
	});
});
