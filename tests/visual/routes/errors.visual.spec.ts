import { expect, test } from '@playwright/test';
import { SNAPSHOT_OPTIONS, stabilise } from '../fixtures/stability';
import { VIEWPORTS } from '../fixtures/viewports';

/**
 * Visual regression — error surfaces.
 *
 * Each route group ships its own +error.svelte (CLAUDE.md rule 8 + arch
 * test #11). This spec snapshots the three reachable error pages:
 *   - root +error.svelte                 — navigated via /this-does-not-exist
 *   - (auth)/+error.svelte                — only reachable via dev hooks
 *   - (app)/+error.svelte                 — only reachable signed in
 *
 * For now we cover the root catch-all. The (auth) + (app) variants get
 * snapshots once the auth-fixture pattern lands and we can force an
 * error from a known starting point.
 */

for (const vp of VIEWPORTS) {
	test.describe(`@visual errors — ${vp.name}`, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		test('404 — unknown route', async ({ page }) => {
			const response = await page.goto('/this-route-does-not-exist');
			// SvelteKit returns 404 with the nearest +error.svelte rendered.
			expect(response?.status()).toBe(404);
			await stabilise(page);
			await expect(page).toHaveScreenshot(`404-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});
	});
}
