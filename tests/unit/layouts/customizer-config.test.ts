import { describe, expect, it } from 'vitest';
import en from '#lib/i18n/locales/en.json';
import { DEFAULT_PREFERENCES, PREFERENCE_VALUES, type Preferences } from '$features/preferences';
import { CUSTOMIZER_GROUPS, visibleGroups } from '$layouts/customizer-config.ts';

const dig = (key: string): unknown =>
	key
		.split('.')
		.reduce<unknown>((n, part) => (n as Record<string, unknown> | undefined)?.[part], en);
const keys = (p: Preferences) => visibleGroups(p).map((g) => g.key);

describe('the customizer config is the preference schema', () => {
	it('has exactly one group per key of PREFERENCE_VALUES, in the Domiex order', () => {
		const schemaKeys = Object.keys(PREFERENCE_VALUES).sort();
		expect(CUSTOMIZER_GROUPS.map((g) => g.key).sort()).toEqual(schemaKeys);
		expect(CUSTOMIZER_GROUPS.map((g) => g.key)).toEqual([
			'layout',
			'navType',
			'contentWidth',
			'sidebar',
			'mode',
			'transparency',
			'darkPalette',
			'sidebarColors',
			'colors'
		]);
	});

	it('offers every value of its axis exactly once', () => {
		for (const g of CUSTOMIZER_GROUPS) {
			const offered = g.options.map((o) => o.value);
			expect(offered).toEqual([...PREFERENCE_VALUES[g.key]]);
			expect(new Set(offered).size).toBe(offered.length);
		}
	});

	it('every title and label exists in en.json (English only for now)', () => {
		for (const g of CUSTOMIZER_GROUPS) {
			expect(typeof dig(g.titleKey), g.titleKey).toBe('string');
			if (g.hintKey) expect(typeof dig(g.hintKey), g.hintKey).toBe('string');
			for (const o of g.options) expect(typeof dig(o.labelKey), o.labelKey).toBe('string');
		}
	});

	it('the transparency group is labelled Glass, Tinted, Solid and the hint names only Chrome and Edge for the system setting', () => {
		const g = CUSTOMIZER_GROUPS.find((x) => x.key === 'transparency')!;
		expect(g.kind).toBe('wireframe');
		expect(g.options.map((o) => o.value)).toEqual(['glass', 'reduced', 'off']);
		expect(g.options.map((o) => dig(o.labelKey))).toEqual(['Glass', 'Tinted', 'Solid']);
		expect(dig(g.titleKey)).toBe('Transparency');
		expect(g.hintKey).toBe('customizer.transparency.hint');
		expect(dig(g.hintKey!)).toMatch(/Chrome and Edge/);
		expect(dig(g.hintKey!)).toMatch(/Reduce transparency/);
		expect(dig(g.hintKey!)).not.toMatch(/iPhone|iOS|Safari/);
	});

	it('hides the layouts that need room below lg, and only those', () => {
		const layout = CUSTOMIZER_GROUPS.find((g) => g.key === 'layout')!;
		expect(layout.options.filter((o) => o.hideBelow === 'lg').map((o) => o.value)).toEqual([
			'modern',
			'semibox'
		]);
		for (const g of CUSTOMIZER_GROUPS.filter((g) => g.key !== 'layout'))
			expect(g.options.some((o) => o.hideBelow)).toBe(false);
	});
});

describe('which groups are shown (L25)', () => {
	it('horizontal hides navType, sidebar and sidebarColors', () => {
		const shown = keys({ ...DEFAULT_PREFERENCES, layout: 'horizontal' });
		for (const k of ['navType', 'sidebar', 'sidebarColors']) expect(shown).not.toContain(k);
		expect(shown).toContain('layout');
		expect(shown).toContain('colors');
	});
	it('the default (light) hides the dark palette; dark and auto show it', () => {
		expect(keys(DEFAULT_PREFERENCES)).not.toContain('darkPalette');
		expect(keys({ ...DEFAULT_PREFERENCES, mode: 'dark' })).toContain('darkPalette');
		expect(keys({ ...DEFAULT_PREFERENCES, mode: 'auto' })).toContain('darkPalette');
		expect(keys({ ...DEFAULT_PREFERENCES, mode: 'black-white' })).not.toContain('darkPalette');
	});
	it('every group is shown in the default non-horizontal state except the dark palette', () => {
		expect(keys(DEFAULT_PREFERENCES)).toEqual(
			CUSTOMIZER_GROUPS.map((g) => g.key).filter((k) => k !== 'darkPalette')
		);
	});
});
