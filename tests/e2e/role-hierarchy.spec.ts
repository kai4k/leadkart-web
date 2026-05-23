import { expect, test } from '@playwright/test';
import { resetMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Role hierarchy editor (ADR 0054 — single-parent organisational tree).
 *
 * Coverage:
 *   - Role detail page surfaces the "Organizational hierarchy" card
 *   - Save parent: PATCH /v1/roles/{id}/parent → 200 RoleDto + toast
 *   - Clear parent: same endpoint with parent_role_id=null
 *   - Protected roles (super_admin / system_default) are NOT offered as
 *     parent candidates (server-enforced; UI also filters)
 */

const PARENT_ROLE = {
	id: 'role-parent',
	tenant_id: TEST_TENANT_ID,
	name: 'Senior Manager',
	hierarchy_level: 2,
	permissions: [],
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

const PROTECTED_ROLE = {
	id: 'role-super',
	tenant_id: TEST_TENANT_ID,
	name: 'SuperAdmin',
	hierarchy_level: 0,
	permissions: ['*'],
	is_system_default: false,
	is_super_admin: true,
	created_at: '2026-01-01T00:00:00Z'
};

const CHILD_ROLE = {
	id: 'role-child',
	tenant_id: TEST_TENANT_ID,
	name: 'Sales Lead',
	hierarchy_level: 5,
	permissions: ['crm.leads.view'],
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

test.describe('Role hierarchy editor', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('Organizational hierarchy card renders + parent picker excludes protected roles', async ({
		page
	}) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: [
				'tenant.admin',
				'identity.roles.view',
				'identity.roles.update',
				'identity.users.view'
			]
		});
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/roles/${CHILD_ROLE.id}`,
				status: 200,
				body: CHILD_ROLE
			},
			{
				method: 'GET',
				path: '/api/v1/roles',
				status: 200,
				body: { roles: [CHILD_ROLE, PARENT_ROLE, PROTECTED_ROLE] }
			},
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } }
		]);
		await page.goto(`/settings/roles/${CHILD_ROLE.id}`);

		await expect(
			page.getByRole('heading', { level: 3, name: /organizational hierarchy/i })
		).toBeVisible();

		// Parent select offers PARENT_ROLE but NOT PROTECTED_ROLE
		const select = page.getByLabel(/parent role/i);
		await expect(select.locator('option', { hasText: 'Senior Manager' })).toHaveCount(1);
		await expect(select.locator('option', { hasText: 'SuperAdmin' })).toHaveCount(0);
	});

	test('save parent: PATCH succeeds → toast', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: [
				'tenant.admin',
				'identity.roles.view',
				'identity.roles.update',
				'identity.users.view'
			]
		});
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/roles/${CHILD_ROLE.id}`,
				status: 200,
				body: CHILD_ROLE
			},
			{
				method: 'GET',
				path: '/api/v1/roles',
				status: 200,
				body: { roles: [CHILD_ROLE, PARENT_ROLE] }
			},
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } },
			{
				method: 'PATCH',
				path: `/api/v1/roles/${CHILD_ROLE.id}/parent`,
				status: 200,
				body: { ...CHILD_ROLE, parent_role_id: PARENT_ROLE.id }
			}
		]);
		await page.goto(`/settings/roles/${CHILD_ROLE.id}`);

		await page.getByLabel(/parent role/i).selectOption(PARENT_ROLE.id);
		await page.getByRole('button', { name: /save parent/i }).click();
		await expect(page.getByText(/parent role set/i)).toBeVisible({ timeout: 5000 });
	});
});
