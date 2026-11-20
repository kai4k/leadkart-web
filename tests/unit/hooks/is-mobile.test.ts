/**
 * `createIsMobile` asks the browser the same question the CSS asks: `64rem`, not 1023px. With a
 * larger default font the two differ, and a px query left no navigation at all.
 */
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../helpers/match-media.ts';
import { createIsMobile } from '#lib/hooks/is-mobile.svelte.ts';

describe('createIsMobile', () => {
	it('queries in rem, the unit of the CSS breakpoint', () => {
		const media = installMatchMedia(1280);
		const query = createIsMobile();
		void query.current;
		expect(media.queries).toEqual(['(width < 64rem)']);
		expect(media.queries.join()).not.toMatch(/px/);
	});
});
