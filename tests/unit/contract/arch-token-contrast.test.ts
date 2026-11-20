import { describe, expect, it } from 'vitest';
import {
	AXES,
	PAIRS,
	check,
	checkCss,
	composite,
	pairRatio,
	parseRules,
	propertiesFor
} from '../../../scripts/arch/check-token-contrast.mjs';

/** Self-test of the contrast gate: tiny fixtures, then the real token files. */
const ONE = {
	colors: ['leadkart'],
	mode: ['light'],
	darkPalette: ['default'],
	sidebarColors: ['light']
};
const ratioOf = (css: string, p: object, mode = 'light') => {
	const { rules } = parseRules(css, 'fixture.css');
	const props = propertiesFor(rules, {
		colors: 'leadkart',
		mode,
		darkPalette: 'default',
		sidebarColors: 'light'
	});
	return pairRatio(p as never, props, mode) as number;
};
const pair = (over: object) => ({ fg: 'fg', bg: 'bg', min: 4.5, label: 'p', ...over });

describe('check-token-contrast: composites alpha over the real backdrop', () => {
	const css = `:root { --card: #ffffff; --dark: #000000; --fg: #000000; --bg: #ffffff;
		--tint: color-mix(in oklch, #888888 10%, transparent); }`;

	it('paints a pair side at `alpha` over the named backdrop in sRGB', () => {
		expect(ratioOf(css, pair({}))).toBeCloseTo(21, 0);
		expect(ratioOf(css, pair({ alpha: 0.5 }))).toBeCloseTo(3.95, 1); // #808080 on white
		const c = composite({ mode: 'rgb', r: 0, g: 0, b: 0 }, 0.5, { mode: 'rgb', r: 1, g: 1, b: 1 });
		expect(c.r).toBeCloseTo(0.5, 5);
	});
	it('composites a mix toward `transparent` over pair.over, not over --card', () => {
		const onCard = ratioOf(css, pair({ fg: 'fg', bg: 'tint' }));
		const onDark = ratioOf(css, pair({ fg: 'fg', bg: 'tint', over: 'dark' }));
		expect(onCard).toBeGreaterThan(15); // a 10% grey over white is nearly white
		expect(onDark).toBeLessThan(2); // the same tint over black is nearly black
	});
	it('alphaOn "bg" lets the surface through the background', () => {
		const solid = ratioOf(css, pair({ over: 'dark' }));
		const seeThrough = ratioOf(css, pair({ over: 'dark', alpha: 0.2, alphaOn: 'bg' }));
		expect(solid).toBeGreaterThan(seeThrough);
	});
});

describe('check-token-contrast: never passes vacuously', () => {
	it('a pair that names a missing variable is a failure', () => {
		const { problems, checked } = checkCss([['f.css', ':root { --card: #fff; --a: #000; }']], {
			pairs: [pair({ fg: 'a', bg: 'nope' })] as never,
			axes: ONE
		});
		expect(checked).toBe(0);
		expect(problems.join('\n')).toContain('--nope is not defined');
	});
	it('a var() that resolves to nothing is a failure', () => {
		const { problems } = checkCss(
			[['f.css', ':root { --card: #fff; --a: #000; --b: var(--missing); }']],
			{ pairs: [pair({ fg: 'a', bg: 'b' })] as never, axes: ONE }
		);
		expect(problems.join('\n')).toContain('--missing is not defined');
	});
	it('no pairs is a failure, not a pass', () => {
		const { problems } = checkCss([['f.css', ':root { --card: #fff; }']], {
			pairs: [],
			axes: ONE
		});
		expect(problems.length).toBeGreaterThan(0);
	});
	it('a sub-threshold pair is reported', () => {
		const { problems } = checkCss([['f.css', ':root { --card: #fff; --a: #777; --b: #888; }']], {
			pairs: [pair({ fg: 'a', bg: 'b' })] as never,
			axes: ONE
		});
		expect(problems[0]).toMatch(/< 4\.5/);
	});
	it('a selector outside :root[data-x] is rejected', () => {
		const { problems } = checkCss([['f.css', '.x { --a: #000; }']], {
			pairs: [pair({})] as never,
			axes: ONE
		});
		expect(problems[0]).toContain('is not :root');
	});
});

describe('check-token-contrast: the real tokens', () => {
	it('passes every pair in every combination', () => {
		const { problems, combinations, checked, pairs } = check();
		expect(problems).toEqual([]);
		expect(combinations).toBe(
			AXES.colors.length * AXES.mode.length * AXES.darkPalette.length * AXES.sidebarColors.length
		);
		expect(checked).toBe(pairs * combinations);
	});
	it('covers the pairs the primitives rely on', () => {
		const labels = PAIRS.map((p: { label: string }) => p.label);
		for (const needed of [
			'primary on background',
			'primary on muted',
			'primary on primary-soft',
			'primary-foreground on primary-hover',
			'destructive-foreground on destructive-hover',
			'ring on muted',
			'input on muted',
			'sidebar-ring on sidebar',
			'sidebar-muted-foreground on sidebar',
			'sidebar-accent-foreground on sidebar-accent (over sidebar)'
		])
			expect(labels).toContain(needed);
	});
});
