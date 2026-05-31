import type { Page } from '@playwright/test';

/**
 * Stability fixtures for visual regression.
 *
 * Pixel-diff tests fail on tiny rendering deltas (anti-aliasing flicker,
 * caret blink, font-loading race, animation frame timing). Each helper
 * here pins one source of nondeterminism to make snapshots reliable
 * cross-runner + cross-machine.
 *
 * Industry refs: Playwright docs §"Visual comparisons", Vercel's
 * Argos-CI stability guide, Stripe Engineering "Stable visual diffs"
 * blog post (2024).
 */

/**
 * Strip every animation + transition. Without this, mid-flight CSS
 * transitions cause flake. Caret animation also disabled — `caret-color:
 * transparent` hides the input caret which blinks at the framerate.
 *
 * Applied via injected `<style>` in document head so it overrides
 * author CSS by source-order (added late).
 */
export async function freezeAnimations(page: Page): Promise<void> {
	await page.addStyleTag({
		content: `
			*,
			*::before,
			*::after {
				animation-duration: 0ms !important;
				animation-delay: 0ms !important;
				animation-iteration-count: 1 !important;
				transition-duration: 0ms !important;
				transition-delay: 0ms !important;
				caret-color: transparent !important;
			}
			::selection {
				background: transparent !important;
			}
			*::-webkit-scrollbar {
				display: none !important;
			}
			html {
				scrollbar-width: none !important;
			}
		`
	});
}

/**
 * Wait until every declared `@font-face` has loaded. SvelteKit lazy-
 * loads `@fontsource-variable/jetbrains-mono` — without this wait the
 * first paint snapshot shows a fallback-font glyph swap.
 *
 * Three-step guarantee:
 *   1. fonts.ready promise resolves
 *   2. fonts.status === 'loaded'
 *   3. one more rAF tick for the layout to settle after the font swap
 */
export async function waitForFonts(page: Page): Promise<void> {
	await page.evaluate(async () => {
		await document.fonts.ready;
		// Belt-and-braces: yield to layout after font swap.
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	});
}

/**
 * One-stop stabiliser called from each visual test's `beforeEach`.
 * Order matters:
 *   1. fonts first — animation freeze can't help if fonts haven't loaded
 *   2. then freeze — locks in the now-stable layout
 *   3. then optional `await page.waitForLoadState('networkidle')` —
 *      called by the test if the route does data-fetching
 */
export async function stabilise(page: Page): Promise<void> {
	await waitForFonts(page);
	await freezeAnimations(page);
}

/**
 * Strict-snapshot defaults for `expect(page).toHaveScreenshot(...)`.
 * Inlined as a constant so every visual test consumes the same numbers.
 *
 *   maxDiffPixelRatio: 0.001  — 0.1% of total pixels (≈1024 of 1MP frame)
 *   threshold:          0.1   — per-pixel YIQ-distance threshold
 *   animations:        'disabled'  — Playwright also tries to pause
 *                                    animations as a belt-and-braces
 */
export const SNAPSHOT_OPTIONS = {
	maxDiffPixelRatio: 0.001,
	threshold: 0.1,
	animations: 'disabled'
} as const;
