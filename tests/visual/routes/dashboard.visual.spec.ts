import { expect, test } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { SNAPSHOT_OPTIONS, stabilise } from '../fixtures/stability';
import { VIEWPORTS } from '../fixtures/viewports';

/**
 * Visual regression — /dashboard for every tier.
 *
 * The dashboard is the landing surface after signin; different tiers
 * see different cards + KPI panels. Each tier's dashboard variant is
 * snapshotted independently to catch tier-specific layout regressions.
 *
 * Only `PlatformDashboard` makes an API call (`/v1/platform/stats`).
 * Tenant-admin and tenant-user dashboards are capability-driven static
 * shells in v0.1 — no mocks required.
 */

const PLATFORM_STATS_FIXTURE = {
	tenants_total: 12,
	tenants_active: 9,
	tenants_suspended: 3,
	persons_total: 156,
	memberships_active: 132
};

for (const vp of VIEWPORTS) {
	test.describe(`@visual dashboard — ${vp.name}`, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		test('platform-super', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'platform-super',
				is_super_user: true,
				permissions: ['platform.tenants.view', 'platform.users.view', 'platform.stats.view'],
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/platform/stats',
						status: 200,
						body: PLATFORM_STATS_FIXTURE
					}
				]
			});
			await page.goto('/dashboard');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`dashboard-platform-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('tenant-admin', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin', 'identity.users.view', 'identity.roles.view']
			});
			await page.goto('/dashboard');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`dashboard-tenant-admin-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('tenant-user', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'tenant-user',
				permissions: ['crm.leads.view']
			});
			await page.goto('/dashboard');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`dashboard-tenant-user-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});
	});
}
