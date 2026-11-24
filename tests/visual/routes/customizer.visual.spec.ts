import { expect, test } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { SNAPSHOT_OPTIONS, setPreferencesCookie, stabilise } from '../fixtures/stability';

/**
 * Visual regression: the theme customizer sheet, open, in light and in dark. The sheet is a glass pane
 * over the page, so the shot is the viewport with both.
 */

for (const mode of ['light', 'dark'] as const) {
	test(`@visual customizer open (${mode})`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await signInForVisual(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await setPreferencesCookie(page, { mode });
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await page.getByRole('button', { name: 'Open theme settings' }).click();
		await expect(page.getByRole('dialog', { name: 'Customize' })).toBeVisible();
		await stabilise(page);
		await expect(page).toHaveScreenshot(`customizer-open-${mode}.png`, { ...SNAPSHOT_OPTIONS });
	});
}
