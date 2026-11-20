import { MediaQuery } from 'svelte/reactivity';

/** `lg` (64rem): below it the shell shows the navigation in a sheet (spec 5.2). */
const MOBILE_BREAKPOINT_REM = 64;

/**
 * True while the viewport is narrower than `breakpointRem`. A reactive `current`; on the server
 * it is `false` (the CSS hides the desktop sidebar below `lg`, so the first paint is right either way).
 * The unit is rem on purpose: the CSS (`lg:`, `layouts.css`) switches at `64rem`, which is 1024px only
 * at the default font size. A px query here left a browser with a larger default font between the two
 * (desktop navigation CSS-hidden, sheet not offered: no navigation at all).
 */
export function createIsMobile(breakpointRem: number = MOBILE_BREAKPOINT_REM): MediaQuery {
	return new MediaQuery(`width < ${breakpointRem}rem`);
}
