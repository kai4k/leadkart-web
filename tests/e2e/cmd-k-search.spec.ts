import { expect, test } from '@playwright/test';
import { resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';

/**
 * Cmd+K omni-search palette (frontend wiring of /v1/search).
 *
 *   Visibility gate is exercised here. Palette interactions
 *   (open + typing + hit rendering) are pending follow-up — bits-ui
 *   Dialog renders inside a portal whose selector model is finicky
 *   under Playwright's default queries. To migrate: scope to the
 *   Dialog content element via role="dialog" + the search input
 *   selector inside it.
 */

test.describe('Cmd+K search palette — visibility gate', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('trigger visible for operator tier', async ({ page }) => {
		await signInAsTier(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view', 'platform.users.view']
		});
		await page.goto('/dashboard');
		await expect(page.locator('button[aria-label="Search (Cmd+K)"]')).toBeVisible();
	});

	test('trigger hidden for tenant-user (no operator permissions)', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await page.goto('/dashboard');
		await expect(page.locator('button[aria-label="Search (Cmd+K)"]')).toHaveCount(0);
	});
});

test.fixme('PENDING: Cmd+K palette open + type + render hits', () => {
	// Migration: switch to scoped queries inside the BitsDialog.Content
	// portal. Reference operator-tenant-management.spec.ts for the
	// canonical mock-server fixture pattern.
});
