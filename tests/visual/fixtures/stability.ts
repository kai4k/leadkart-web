import { expect, type Page } from '@playwright/test';
import { encodePreferences, PREFERENCES_COOKIE } from '../../../src/lib/features/preferences/codec';
import {
	DEFAULT_PREFERENCES,
	type Preferences
} from '../../../src/lib/features/preferences/schema';

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
 * Applied as a same-origin stylesheet served by a Playwright route, added
 * late so it overrides author CSS by source-order. The app's CSP refuses
 * inline styles (`style-src-elem 'self'`) and these tests keep that CSP on,
 * so an injected `<style>` is not an option.
 */
const FREEZE_STYLESHEET = '/__visual-freeze.css';
const FREEZE_CSS = `
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
`;

export async function freezeAnimations(page: Page): Promise<void> {
	await page.route(`**${FREEZE_STYLESHEET}`, (route) =>
		route.fulfill({ contentType: 'text/css', body: FREEZE_CSS })
	);
	await page.addStyleTag({ url: FREEZE_STYLESHEET });
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
 * Snapshot defaults for `expect(page).toHaveScreenshot(...)`, shared by every visual test.
 *
 *   maxDiffPixelRatio: 0.02  — 2% of the frame. Almost every shot has a glass layer (topbar, sidebar,
 *                              dialogs), and `backdrop-filter` blur is GPU/driver dependent, so a tighter
 *                              bound flakes on the blur edge. A layout regression moves far more pixels.
 *   threshold:          0.1  — per-pixel YIQ-distance threshold
 *   animations:        'disabled' — Playwright also pauses animations (belt and braces with the freeze)
 *   caret:             'hide'
 *
 * The freeze stylesheet above never touches `backdrop-filter`: the material is the thing under test.
 */
export const SNAPSHOT_OPTIONS = {
	maxDiffPixelRatio: 0.02,
	threshold: 0.1,
	animations: 'disabled',
	caret: 'hide'
} as const;

/**
 * Write the `lk_ui` preferences cookie for the next navigation, as a returning visitor has it: the
 * server then writes the axes onto <html>. Axes not given stay at their defaults.
 */
export async function setPreferencesCookie(
	page: Page,
	prefs: Partial<Preferences> = {}
): Promise<void> {
	await page.context().addCookies([
		{
			name: PREFERENCES_COOKIE,
			value: encodePreferences({ ...DEFAULT_PREFERENCES, ...prefs }),
			url: 'http://localhost:4173'
		}
	]);
}

/**
 * Take the full-page shot of the page as it stands. At desktop width it also takes the dark twin
 * (`<name>-dark-desktop`): the preference cookie flips to dark and the same page reloads, so every
 * covered route has a light and a dark baseline (plan Task 30).
 */
export async function expectShots(page: Page, name: string, viewport: string): Promise<void> {
	await expect(page).toHaveScreenshot(`${name}-${viewport}.png`, {
		fullPage: true,
		...SNAPSHOT_OPTIONS
	});
	if (viewport !== 'desktop') return;
	await setPreferencesCookie(page, { mode: 'dark' });
	await page.reload();
	await page.waitForLoadState('networkidle');
	await stabilise(page);
	await expect(page).toHaveScreenshot(`${name}-dark-${viewport}.png`, {
		fullPage: true,
		...SNAPSHOT_OPTIONS
	});
}
