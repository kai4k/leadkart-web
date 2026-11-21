import { describe, expect, it } from 'vitest';
import { CUSTOMIZER_GROUPS } from '$layouts/customizer-config.ts';
import type { PreferenceKey } from '$features/preferences';
import { AXES } from '../../../scripts/arch/check-token-contrast.mjs';

describe('the customizer never offers a value outside the contrast gate (server project: it reads the script)', () => {
	it('only offers a combination the contrast gate covers (palette x mode x dark palette x sidebar)', () => {
		const offered = (k: PreferenceKey) =>
			CUSTOMIZER_GROUPS.find((g) => g.key === k)!.options.map((o) => o.value as string);
		for (const v of offered('colors')) expect(AXES.colors).toContain(v);
		for (const v of offered('darkPalette')) expect(AXES.darkPalette).toContain(v);
		for (const v of offered('sidebarColors')) expect(AXES.sidebarColors).toContain(v);
		// every Transparency level offered is a level the gate runs (glass, reduced, off)
		expect(offered('transparency').sort()).toEqual([...AXES.transparency].sort());
		// `auto` is the OS choosing light or dark, which the gate covers as those two
		for (const v of offered('mode')) expect([...AXES.mode, 'auto']).toContain(v);
	});
});
