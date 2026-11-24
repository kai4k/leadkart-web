import { test } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { expectShots, stabilise } from '../fixtures/stability';
import { VIEWPORTS } from '../fixtures/viewports';
import { fakeTenantDto, fakeUserDto, TEST_TENANT_ID } from '../../e2e/helpers/fake-jwt';

/**
 * Visual regression — /settings/* surfaces.
 *
 * Account: profile, security, sessions, activity
 * Tenant:  profile, statutory, contact, preferences
 * RBAC:    /settings/users, /settings/roles
 *
 * Each route is snapshotted at all three viewports. The settings
 * domain is the second-most-visited surface after dashboard, and
 * form alignment + card padding inconsistencies surface here first
 * (e.g. ChangeEmailForm vs ChangePasswordForm width regression).
 */

for (const vp of VIEWPORTS) {
	test.describe(`@visual settings — ${vp.name}`, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		// ── Account ────────────────────────────────────────────────
		test('account / profile', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-user',
				permissions: ['identity.profile.update']
			});
			await page.goto('/settings/account/profile');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-account-profile`, vp.name);
		});

		test('account / security', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-user',
				permissions: ['identity.profile.update']
			});
			await page.goto('/settings/account/security');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-account-security`, vp.name);
		});

		test('account / sessions — empty', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-user',
				permissions: ['identity.profile.update']
			});
			await page.goto('/settings/account/sessions');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-account-sessions`, vp.name);
		});

		// ── Tenant ─────────────────────────────────────────────────
		test('tenant / profile', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'tenant.profile.update'],
				mocks: [
					{
						method: 'GET',
						path: `/api/v1/tenants/${TEST_TENANT_ID}`,
						status: 200,
						body: fakeTenantDto()
					}
				]
			});
			await page.goto('/settings/tenant/profile');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-tenant-profile`, vp.name);
		});

		test('tenant / statutory', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'tenant.profile.update'],
				mocks: [
					{
						method: 'GET',
						path: `/api/v1/tenants/${TEST_TENANT_ID}`,
						status: 200,
						body: fakeTenantDto()
					}
				]
			});
			await page.goto('/settings/tenant/statutory');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-tenant-statutory`, vp.name);
		});

		test('tenant / contact', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'tenant.profile.update'],
				mocks: [
					{
						method: 'GET',
						path: `/api/v1/tenants/${TEST_TENANT_ID}`,
						status: 200,
						body: fakeTenantDto()
					}
				]
			});
			await page.goto('/settings/tenant/contact');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-tenant-contact`, vp.name);
		});

		test('tenant / preferences', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'tenant.profile.update'],
				mocks: [
					{
						method: 'GET',
						path: `/api/v1/tenants/${TEST_TENANT_ID}`,
						status: 200,
						body: fakeTenantDto()
					}
				]
			});
			await page.goto('/settings/tenant/preferences');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-tenant-preferences`, vp.name);
		});

		// ── RBAC ───────────────────────────────────────────────────
		test('users — empty', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'identity.users.view'],
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/users',
						status: 200,
						body: { users: [], has_more: false }
					},
					{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
				]
			});
			await page.goto('/settings/users');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-users-empty`, vp.name);
		});

		test('users — populated', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'identity.users.view'],
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/users',
						status: 200,
						body: {
							users: [
								fakeUserDto({
									first_name: 'Alice',
									last_name: 'Anderson',
									email: 'alice@acme.test',
									designation: 'Sales Lead'
								}),
								fakeUserDto({
									membership_id: '00000000-0000-4000-8000-000000000b02',
									person_id: '00000000-0000-4000-8000-000000000a02',
									first_name: 'Bob',
									last_name: 'Brown',
									email: 'bob@acme.test',
									designation: 'Account Manager'
								})
							],
							has_more: false
						}
					},
					{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
				]
			});
			await page.goto('/settings/users');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-users-populated`, vp.name);
		});

		test('roles — empty', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'identity.roles.view'],
				mocks: [{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }]
			});
			await page.goto('/settings/roles');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expectShots(page, `settings-roles-empty`, vp.name);
		});
	});
}
