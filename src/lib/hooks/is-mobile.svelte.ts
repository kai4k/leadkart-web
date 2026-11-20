import { MediaQuery } from 'svelte/reactivity';

/** `lg` (64rem): below it the shell shows the navigation in a sheet (spec 5.2). */
const MOBILE_BREAKPOINT = 1024;

/**
 * True while the viewport is narrower than `breakpoint` (px). A reactive `current`; on the server
 * it is `false` (the CSS hides the desktop sidebar below `lg`, so the first paint is right either way).
 */
export function createIsMobile(breakpoint: number = MOBILE_BREAKPOINT): MediaQuery {
	return new MediaQuery(`max-width: ${breakpoint - 1}px`);
}
