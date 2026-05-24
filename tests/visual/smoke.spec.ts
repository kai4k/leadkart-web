import { expect, test } from '@playwright/test';

/**
 * Visual regression smoke baseline (arch tests #189-194, #257-260).
 *
 * Captures pixel snapshots of the unauthenticated landing surfaces.
 * Playwright `toHaveScreenshot` writes baselines on first run; CI then
 * compares against the committed PNGs in tests/visual/screenshots/.
 *
 * Scope: signin + forgot-password + the dev styleguide catalog. These
 * routes don't require an authenticated mock principal so they're
 * stable enough to baseline without a fixtures dance.
 *
 * Authenticated-route visual snapshots are a Wave-3 addition once
 * Storybook stories cover the primitives the data routes consume —
 * snapshotting against ad-hoc mock JSON drifts faster than the design.
 *
 * Run locally:
 *   npx playwright test tests/visual           # compare against baseline
 *   npx playwright test tests/visual --update-snapshots   # regenerate
 *
 * CI runs the compare path only; new baselines must be committed
 * intentionally by the engineer who changes the design.
 */
test.describe('visual smoke @visual', () => {
	test('signin page', async ({ page }) => {
		await page.goto('/signin');
		await page.waitForLoadState('networkidle');
		// Disable animations + caret blink to avoid flake.
		await page.addStyleTag({
			content: `
				*, *::before, *::after {
					animation-duration: 0ms !important;
					animation-iteration-count: 1 !important;
					transition-duration: 0ms !important;
					caret-color: transparent !important;
				}
			`
		});
		await expect(page).toHaveScreenshot('signin.png', {
			fullPage: true,
			maxDiffPixelRatio: 0.02
		});
	});

	test('forgot-password page', async ({ page }) => {
		await page.goto('/forgot-password');
		await page.waitForLoadState('networkidle');
		await page.addStyleTag({
			content: `*, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; caret-color: transparent !important; }`
		});
		await expect(page).toHaveScreenshot('forgot-password.png', {
			fullPage: true,
			maxDiffPixelRatio: 0.02
		});
	});
});
