import type { Page } from '@playwright/test';

/**
 * Bring a page to the state a person reads before an axe scan looks at it.
 *
 * The (auth) pages render in the browser (ssr = false) and the app is interactive only once hydrated:
 * a scan that starts at the load event can see a document with no landmark yet. And axe reads colours
 * as painted: a card still fading in is measured half transparent. So: wait for hydration, then settle
 * every finite animation (reduced motion removes them) before the scan.
 */
export async function settleForScan(page: Page): Promise<void> {
	await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every(
				(a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity
			)
	);
}
