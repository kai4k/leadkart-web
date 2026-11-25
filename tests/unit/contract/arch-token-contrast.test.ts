import { describe, expect, it, vi } from 'vitest';
import {
	AXES,
	PAIRS,
	check,
	checkCss,
	composite,
	pairRatio,
	parseRules,
	propertiesFor,
	themeFiles,
	UNGATED_THEME_FILES
} from '../../../scripts/arch/check-token-contrast.mjs';

// the real gate resolves 1,320 combinations: slow on a loaded runner
vi.setConfig({ testTimeout: 30_000 });

/** Self-test of the contrast gate: tiny fixtures, then the real token files. */
const ONE = {
	palette: ['iris'],
	mode: ['light'],
	sidebarColors: ['light']
};
const ratioOf = (css: string, p: object, mode = 'light') => {
	const { rules } = parseRules(css, 'fixture.css');
	const props = propertiesFor(rules, {
		palette: 'iris',
		mode,
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
			AXES.palette.length * AXES.mode.length * AXES.sidebarColors.length * AXES.transparency.length
		);
		expect(checked).toBe(pairs * combinations);
	});
	it('covers the pairs the primitives rely on', () => {
		const labels = PAIRS.map((p: { label: string }) => p.label);
		for (const needed of [
			'primary-text on background',
			'primary-text on muted',
			'primary-text on primary-soft',
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

describe('check-token-contrast: fix round B tokens', () => {
	const pairLabels = PAIRS.map((p: { label: string }) => p.label);
	it('gates the tertiary text, status text on muted, the indicators and the toast description', () => {
		for (const needed of [
			'subtle-foreground on background [tertiary text]',
			'subtle-foreground on muted [tertiary text]',
			'subtle-foreground on popover [tertiary text]',
			'warning on muted [status text]',
			'success on background [status text]',
			'info on card [status text]',
			'success-indicator on muted [dot, bar or icon mark]',
			'destructive-indicator on background [dot, bar or icon mark]',
			'muted-foreground on warning-soft [toast description]'
		])
			expect(pairLabels).toContain(needed);
	});
	it('indicator pairs are held to 3:1, text pairs to 4.5', () => {
		const get = (l: string) =>
			PAIRS.find((p: { label: string }) => p.label === l) as { min: number };
		expect(get('info-indicator on card [dot, bar or icon mark]').min).toBe(3);
		expect(get('subtle-foreground on card [tertiary text]').min).toBe(4.5);
	});
});

describe('check-token-contrast: the axes (gate v3)', () => {
	it('palette is the four logo palettes and mode is light and dark', () => {
		expect([...AXES.palette]).toEqual(['iris', 'ocean', 'coral', 'emerald']);
		expect([...AXES.mode]).toEqual(['light', 'dark']);
	});
	it('has no retired axis', () => {
		expect(Object.keys(AXES)).not.toContain('darkPalette');
		expect(Object.keys(AXES)).not.toContain('colors');
	});
});

describe('check-token-contrast: the Pebble World role pairs', () => {
	const PW = PAIRS as Array<{ fg: string; bg: string; min: number }>;
	const min = (fg: string, bg: string) => PW.find((p) => p.fg === fg && p.bg === bg)?.min;
	it('gates the tonal button, field border, meter, focus ring and count', () => {
		expect(min('primary-tonal-foreground', 'primary-tonal')).toBe(4.5);
		expect(min('field-border', 'card')).toBe(3);
		expect(min('field-border', 'muted')).toBe(3);
		expect(min('meter-track', 'primary-indicator')).toBe(3);
		expect(min('focus-ring', 'background')).toBe(3);
		expect(min('focus-ring', 'card')).toBe(3);
		expect(min('badge-count-foreground', 'badge-count')).toBe(4.5);
	});
	it('gates text on the wallpaper', () => {
		for (const w of ['wall-1', 'wall-2', 'wall-3']) expect(min('foreground', w)).toBe(4.5);
	});
	it('gates the white glyph on every app colour at 3:1', () => {
		for (const app of [
			'home',
			'leads',
			'orders',
			'stock',
			'dispatch',
			'payments',
			'reports',
			'team',
			'settings',
			'companies',
			'people'
		])
			expect(min('app-glyph', `app-${app}`), app).toBe(3);
	});
});

describe('check-token-contrast: scoped re-declarations (layouts.css)', () => {
	const BASE = ':root { --card: #fff; --fg: #000; --band: #bfdbfe; --on-band: #1e3a8a; }';
	const SCOPED_OK = `${BASE}
		:root[data-nav-type='pattern'] [data-shell='topbar'] { --fg: var(--on-band); }`;
	const SCOPED_BAD = `${BASE}
		:root[data-nav-type='pattern'] [data-shell='topbar'] { --fg: #93c5fd; }`;
	const scope = { selector: "[data-shell='topbar']", attrs: { 'data-nav-type': 'pattern' } };
	const scopedPair = pair({ fg: 'fg', bg: 'band', scope });

	it('collects a scoped rule only when the selector is a descendant re-declaration', () => {
		const { rules, errors } = parseRules(SCOPED_OK, 'layouts.css', { lenient: true });
		expect(errors).toEqual([]);
		expect(rules.filter((r: { scope?: string }) => r.scope)).toHaveLength(1);
		// a strict file refuses it: only layouts.css may carry geometry selectors
		expect(parseRules(`.a .b { --x: 1; }`, 'x.css').errors).toHaveLength(1);
		expect(parseRules(`.a .b { --x: 1; }`, 'layouts.css', { lenient: true }).errors).toEqual([]);
	});

	it('the scope applies only inside its scope and only with its attribute', () => {
		const { rules } = parseRules(SCOPED_OK, 'layouts.css', { lenient: true });
		const combo = {
			palette: 'iris',
			mode: 'light',
			sidebarColors: 'light'
		};
		expect(propertiesFor(rules, combo).get('--fg')).toBe('#000');
		expect(propertiesFor(rules, combo, scope).get('--fg')).toBe('var(--on-band)');
		expect(
			propertiesFor(rules, combo, { selector: "[data-shell='other']", attrs: scope.attrs }).get(
				'--fg'
			)
		).toBe('#000');
	});

	it('passes when the scoped value keeps the pair legible', () => {
		const r = checkCss([['layouts.css', SCOPED_OK]], { pairs: [scopedPair] as never, axes: ONE });
		expect(r.problems).toEqual([]);
		expect(r.checked).toBe(1);
	});

	it('a scoped re-declaration that breaks a pair fails (the root value alone would pass)', () => {
		const r = checkCss([['layouts.css', SCOPED_BAD]], { pairs: [scopedPair] as never, axes: ONE });
		expect(r.problems.join('\n')).toContain('< 4.5');
		// the same pair without the scope reads the black root value and passes
		const rootOnly = checkCss([['layouts.css', SCOPED_BAD]], {
			pairs: [pair({ fg: 'fg', bg: 'band' })] as never,
			axes: ONE
		});
		expect(rootOnly.problems).toEqual([]);
	});

	it('reads every theme file the barrel imports, layouts.css included', () => {
		const files = themeFiles();
		expect(files).toEqual(
			expect.arrayContaining([
				'src/styles/theme/palettes.css',
				'src/styles/theme/semantic.css',
				'src/styles/theme/layouts.css'
			])
		);
	});

	it('skips only the pinned fallback file, which declares no token', () => {
		expect(UNGATED_THEME_FILES).toEqual(['src/styles/theme/materials-fallbacks.css']);
		expect(themeFiles()).not.toContain('src/styles/theme/materials-fallbacks.css');
	});

	it('the real pattern-topbar pairs are in the gate', () => {
		expect(PAIRS.filter((p: { scope?: unknown }) => p.scope).length).toBeGreaterThanOrEqual(6);
	});
});

describe('check-token-contrast: primary roles (plan G1)', () => {
	const ROLES = `:root { --card: #ffffff; --muted: #e6e6ef; --background: #f4f4f8; --popover: #ffffff;
		--fill: #7ccf00; --label-white: #ffffff; --label-dark: #1a2e05;
		--indicator: #7ccf00; --indicator-fg: #ffffff; --thumb: #ffffff; }`;
	const run = (p: object) =>
		checkCss([['f.css', ROLES]], { pairs: [pair(p)] as never, axes: ONE }).problems.join('\n');

	it('a vivid lime fill with a white label fails, with the dark label it passes', () => {
		expect(run({ fg: 'label-white', bg: 'fill' })).toContain('< 4.5');
		expect(run({ fg: 'label-dark', bg: 'fill' })).toBe('');
	});
	it('an indicator under 3:1 on the muted surface fails', () => {
		expect(run({ fg: 'indicator', bg: 'muted', min: 3 })).toContain('< 3');
	});
	it('the glyph on the indicator and the thumb on the track are gated at 3:1', () => {
		expect(run({ fg: 'indicator-fg', bg: 'indicator', min: 3 })).toContain('< 3');
		expect(run({ fg: 'thumb', bg: 'indicator', min: 3 })).toContain('< 3');
	});
	it('the real gate carries the role pairs for every palette', () => {
		const labels = PAIRS.map((p: { label: string }) => p.label);
		for (const needle of [
			'primary-text on background',
			'primary-text on primary-soft',
			'primary-indicator on muted',
			'primary-indicator-foreground on primary-indicator',
			'background on primary-indicator',
			'sidebar-icon on sidebar'
		])
			expect(
				labels.some((l: string) => l.startsWith(needle)),
				needle
			).toBe(true);
		expect(labels.some((l: string) => l.startsWith('primary on '))).toBe(false); // primary is no longer text
		expect(check().problems).toEqual([]);
	});
});
