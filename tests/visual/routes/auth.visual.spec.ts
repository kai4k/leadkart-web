import { expect, test } from '@playwright/test';
import { SNAPSHOT_OPTIONS, stabilise } from '../fixtures/stability';
import { VIEWPORTS } from '../fixtures/viewports';

/**
 * Visual regression — auth surface (unauthenticated).
 *
 * Covers every public route the unauthenticated visitor can reach:
 *   - /signin
 *   - /forgot-password
 *   - /reset-password (with mock token in query)
 *   - /verify-email (with mock token in query)
 *
 * No backend mocking needed — these routes render the form shells
 * without server-side data. `/reset-password` + `/verify-email` accept
 * any token at render-time; the API call only fires on submit.
 *
 * Each viewport snapshots `fullPage: true` so footer / mobile-stacked
 * layouts are verified end-to-end.
 */

for (const vp of VIEWPORTS) {
	test.describe(`@visual auth — ${vp.name}`, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		test('signin', async ({ page }) => {
			await page.goto('/signin');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`signin-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('forgot-password', async ({ page }) => {
			await page.goto('/forgot-password');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`forgot-password-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('reset-password — with token', async ({ page }) => {
			await page.goto('/reset-password?token=mock-token-for-visual');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`reset-password-with-token-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('reset-password — missing token', async ({ page }) => {
			await page.goto('/reset-password');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`reset-password-missing-token-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('verify-email — with token', async ({ page }) => {
			await page.goto('/verify-email?token=mock-verify-token');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`verify-email-with-token-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});
	});
}
