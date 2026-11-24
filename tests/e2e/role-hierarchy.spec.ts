import { expect, test, type Route } from './helpers/test';
import { resetMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { clientNavigate } from './helpers/navigation';
import { TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Role hierarchy editor (ADR 0054 — single-parent organisational tree).
 *
 * Coverage:
 *   - Role detail page surfaces the "Organizational hierarchy" card
 *   - Save parent: PATCH /v1/roles/{id}/parent → 204 (roles_http.go:143) + toast
 *   - Clear parent: same endpoint with parent_role_id=null
 *   - Protected roles (super_admin / system_default) are NOT offered as
 *     parent candidates (server-enforced; UI also filters)
 */

const PARENT_ROLE = {
	id: '00000000-0000-4000-8000-000000000105',
	tenant_id: TEST_TENANT_ID,
	name: 'Senior Manager',
	hierarchy_level: 2,
	permissions: [],
	is_active: true,
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

const PROTECTED_ROLE = {
	id: '00000000-0000-4000-8000-000000000106',
	tenant_id: TEST_TENANT_ID,
	name: 'SuperAdmin',
	hierarchy_level: 0,
	permissions: ['*'],
	is_active: true,
	is_system_default: false,
	is_super_admin: true,
	created_at: '2026-01-01T00:00:00Z'
};

const CHILD_ROLE = {
	id: '00000000-0000-4000-8000-000000000107',
	tenant_id: TEST_TENANT_ID,
	name: 'Sales Lead',
	hierarchy_level: 5,
	permissions: ['crm.leads.view'],
	is_active: true,
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

test.describe('Role hierarchy editor', () => {
	// The 'Saved banner' test intercepts the PATCH with page.route. In WebKit a page.route misses the requests of a page
	// a service worker controls (the PATCH reaches the mock untouched), so the worker is blocked in this spec. It is
	// not blocked for the whole webkit project: other specs test the worker itself.
	test.use({ serviceWorkers: 'block' });

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
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } }
		]);
		await page.goto(`/settings/roles/${CHILD_ROLE.id}`);

		await expect(
			page.getByRole('heading', { level: 2, name: /organizational hierarchy/i })
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
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
			{
				method: 'PATCH',
				path: `/api/v1/roles/${CHILD_ROLE.id}/parent`,
				status: 204
			}
		]);
		await page.goto(`/settings/roles/${CHILD_ROLE.id}`);

		await page.getByLabel(/parent role/i).selectOption(PARENT_ROLE.id);
		await page.getByRole('button', { name: /save parent/i }).click();
		await expect(page.getByText(/parent role set/i)).toBeVisible({ timeout: 5000 });
	});

	test('the Saved banner belongs to the role on screen: reset on switch, a late save for the previous role never sets it', async ({
		page
	}) => {
		await signInAsTier(page, {
			tier: 'tenant-admin',
			permissions: ['tenant.admin', 'identity.roles.view', 'identity.roles.update']
		});
		await registerMocks([
			{ method: 'GET', path: `/api/v1/roles/${CHILD_ROLE.id}`, status: 200, body: CHILD_ROLE },
			{ method: 'GET', path: `/api/v1/roles/${PARENT_ROLE.id}`, status: 200, body: PARENT_ROLE },
			{
				method: 'GET',
				path: '/api/v1/roles',
				status: 200,
				body: { roles: [CHILD_ROLE, PARENT_ROLE] }
			},
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
			{
				method: 'PATCH',
				path: `/api/v1/roles/${CHILD_ROLE.id}/parent`,
				status: 204
			}
		]);
		// A success Alert is role=status since 5b23601 (only destructive and warning are role=alert).
		const saved = page.getByRole('status').getByText('Saved.', { exact: true });
		const heading = (name: string) => page.getByRole('heading', { level: 1, name });

		await page.goto(`/settings/roles/${CHILD_ROLE.id}`);
		await page.getByLabel(/parent role/i).selectOption(PARENT_ROLE.id);
		await page.getByRole('button', { name: /save parent/i }).click();
		await expect(saved).toBeVisible();

		await clientNavigate(page, `/settings/roles/${PARENT_ROLE.id}`);
		await expect(heading(PARENT_ROLE.name)).toBeVisible();
		await expect(saved).toHaveCount(0);

		// Hold the next save for the child until the user is on another role.
		let release: (() => Promise<void>) | undefined;
		await page.route(`**/api/v1/roles/${CHILD_ROLE.id}/parent`, (route: Route) => {
			release = () => route.continue();
		});
		await clientNavigate(page, `/settings/roles/${CHILD_ROLE.id}`);
		await expect(heading(CHILD_ROLE.name)).toBeVisible();
		// Pick whichever value differs from the current one so the save is enabled.
		const picker = page.getByLabel(/parent role/i);
		const saveParent = page.getByRole('button', { name: /save parent/i });
		await picker.selectOption((await picker.inputValue()) === '' ? PARENT_ROLE.id : '');
		await expect(saveParent).toBeEnabled();
		await saveParent.click();
		await expect.poll(() => release !== undefined).toBe(true);

		await clientNavigate(page, `/settings/roles/${PARENT_ROLE.id}`);
		await expect(heading(PARENT_ROLE.name)).toBeVisible();
		// Leaving the role detached the mutation (the page stays mounted): nothing here may claim it
		// saved, and the child's late save reports through the global toast, once.
		const toasts = page
			.locator('[data-sonner-toast]')
			.filter({ hasText: /parent role (set|cleared)/i });
		await expect(toasts).toHaveCount(0);
		const settled = page.waitForResponse(`**/api/v1/roles/${CHILD_ROLE.id}/parent`);
		await release?.();
		await settled;
		await expect(toasts).toHaveCount(1);
		// What the user sees on the parent role's page: no "Saved." banner for the other role's save.
		await expect(saved).toHaveCount(0);
	});
});
