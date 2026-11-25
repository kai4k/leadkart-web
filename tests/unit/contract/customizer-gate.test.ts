import { describe, expect, it } from 'vitest';
import { CUSTOMIZER_GROUPS } from '#lib/layouts/customizer-config.ts';
import type { PreferenceKey } from '#lib/features/preferences/index.ts';
import { AXES } from '../../../scripts/arch/check-token-contrast.mjs';

describe('the customizer never offers a value outside the contrast gate (server project: it reads the script)', () => {
	it('only offers a combination the contrast gate covers (palette x mode x sidebar x transparency)', () => {
		const offered = (k: PreferenceKey) =>
			CUSTOMIZER_GROUPS.find((g) => g.key === k)!.options.map((o) => o.value as string);
		expect(offered('palette').sort()).toEqual([...AXES.palette].sort());
		for (const v of offered('sidebarColors')) expect(AXES.sidebarColors).toContain(v);
		// every Transparency level offered is a level the gate runs (glass, reduced, off)
		expect(offered('transparency').sort()).toEqual([...AXES.transparency].sort());
		// `auto` is the OS choosing light or dark, which the gate covers as those two
		for (const v of offered('mode')) expect([...AXES.mode, 'auto']).toContain(v);
	});
});
