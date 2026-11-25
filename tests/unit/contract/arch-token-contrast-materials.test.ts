/**
 * Self-test of the material half of the contrast gate (plan G3): fixtures first, then the real files.
 * The method is scripts/arch/lib/material-bound.mjs + checkMaterials in check-token-contrast.mjs.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
	AXES,
	MATERIAL_LAYERS,
	PAIRS,
	PEBBLE_TOP,
	check,
	checkCss,
	checkMaterials,
	minAlpha,
	pairRatio
} from '../../../scripts/arch/check-token-contrast.mjs';
import { base, gate, layer, pair, propsFor } from './material-fixtures.ts';
import {
	applySaturate,
	contrastChannel,
	corners
} from '../../../scripts/arch/lib/material-bound.mjs';

// the real gate resolves 120 combinations x every pair and layer: slow on a loaded runner
vi.setConfig({ testTimeout: 30_000 });

describe('check-token-contrast: the legibility bound of a material (plan G3)', () => {
	it('1. a fill that is too transparent fails, naming the layer, the mode and the ratio', () => {
		const text = gate(base('', 40), layer({ text: ['mfg'] })).problems.join('\n');
		expect(text).toContain('iris/light');
		expect(text).toContain('bar: mfg');
		expect(text).toMatch(/darkest backdrop · \d+\.\d\d < 4\.5/);
	});

	it('2. a fill at 92% is not glass, even though every ratio passes', () => {
		const { problems } = gate(base('', 92), layer());
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('bar-fill at 0.92 is not glass');
		expect(problems[0]).toContain(
			'lift the text token (vibrancy), add a dim layer behind the layer, or restrict its backdrop'
		);
		// the Tinted level is the same alpha on purpose: only `glass` is held to the limit
		expect(gate(base('', 92), layer(), 'light', 'reduced').problems).toEqual([]);
	});

	it('3. the saturate bound bites: a corner moves with saturate(2), and a pair that passes at 1 fails at 2', () => {
		type Corner = { side: string; color: { r: number; g: number; b: number } };
		const lo = (s: number) =>
			(corners(['#ff8844', '#ffffff'], s, 1) as Corner[]).find((c) => c.side === 'lo')!.color;
		expect(lo(2)).not.toEqual(lo(1));
		const l = layer({ backdrops: ['#ff8844', '#ffffff'], text: ['weak'] });
		expect(gate(base(), l).problems).toEqual([]);
		expect(gate(base().replace('--bar-sat: 1', '--bar-sat: 2'), l).problems.join('\n')).toContain(
			'weak on bar-fill'
		);
	});

	it('4. luminosity compression helps: the same fill passes at contrast(0.6) and fails at contrast(1)', () => {
		const l = layer({ text: ['mfg'] });
		expect(gate(base().replace('--bar-con: 1', '--bar-con: 0.6'), l).problems).toEqual([]);
		expect(gate(base(), l).problems.join('\n')).toContain('mfg on bar-fill');
	});

	it('5. off is opaque: every material pair equals the plain opaque pair', () => {
		const css = base(
			`} :root[data-transparency='off'] { --bar-fill: var(--card); --bar-sat: 1; --bar-con: 1;`
		);
		const props = propsFor(css, 'off');
		const { results, problems } = checkMaterials(props, 'light', 'fx', 'off', [
			layer({ text: ['mfg', 'text'] })
		] as never) as { results: Array<{ token: string; ratio: number }>; problems: string[] };
		expect(problems).toEqual([]);
		expect(results.length).toBeGreaterThan(0);
		for (const t of ['mfg', 'text']) {
			const plain = pairRatio(pair({ fg: t, bg: 'card' }) as never, props, 'light') as number;
			for (const r of results.filter((x) => x.token === t)) expect(r.ratio).toBeCloseTo(plain, 6);
		}
	});

	it('6. a missing material token fails, never skips', () => {
		expect(
			gate(base(), layer({ saturate: 'material-milk-saturate' })).problems.join('\n')
		).toContain('--material-milk-saturate is not defined');
		expect(gate(base(), layer({ fill: 'nope' })).problems.join('\n')).toContain(
			'--nope is not defined'
		);
	});

	it('6b. a layer with no declared backdrop set fails (a text token on a material nobody described)', () => {
		expect(gate(base(), layer({ backdrops: [] })).problems.join('\n')).toContain(
			'declares no backdrop set'
		);
		expect(gate(base(), layer({ text: [], marks: [] })).problems.join('\n')).toContain(
			'declares no text and no marks'
		);
	});

	it('7. under a scrim in dark mode a lower opacity is enough', () => {
		const props = propsFor(base().replace('--bar-con: 1', '--bar-con: 0.6'), 'glass', 'dark');
		const without = minAlpha(props, 'dark', layer() as never, 'mfg') as number;
		const withScrim = minAlpha(props, 'dark', layer({ under: 'scrim' }) as never, 'mfg') as number;
		expect(withScrim).toBeLessThan(without);
	});

	it('7a. the sidebar icon mark is 3:1 over the sidebar composite: a vivid lime indicator fails', () => {
		const css = base('--sidebar-icon: #7ccf00; --sidebar-ok: #545454;');
		const l = (mark: string) => layer({ layer: 'sidebar-desktop', text: [], marks: [mark] });
		expect(gate(css, l('sidebar-icon')).problems.join('\n')).toContain('sidebar-icon on bar-fill');
		expect(gate(css, l('sidebar-ok')).problems).toEqual([]);
	});

	it('a material fill 26 points too transparent in the REAL files would fail (mutation)', () => {
		const files = ['palettes', 'semantic', 'materials', 'layouts'].map(
			(n) =>
				[`src/styles/theme/${n}.css`, readFileSync(`src/styles/theme/${n}.css`, 'utf8')] as [
					string,
					string
				]
		);
		const mutate = (css: string) =>
			css.replace(
				'color-mix(in srgb, var(--card) 86%, transparent)',
				'color-mix(in srgb, var(--card) 60%, transparent)'
			);
		const bad = files.map(([n, css]) => [
			n,
			n.endsWith('materials.css') ? mutate(css) : css
		]) as Array<[string, string]>;
		expect(bad[2][1]).not.toBe(files[2][1]);
		const r = checkCss(bad, { layers: MATERIAL_LAYERS as never });
		expect(r.problems.some((p: string) => p.includes('topbar: material-muted-foreground'))).toBe(
			true
		);
	});

	it('the transparency axis is part of the gate: glass, reduced and off, every combination', () => {
		expect(AXES.transparency).toEqual(['glass', 'reduced', 'off']);
		const r = check() as { combinations: number; materialChecks: number; problems: string[] };
		expect(r.combinations).toBe(
			AXES.palette.length * AXES.mode.length * AXES.sidebarColors.length * 3
		);
		// never vacuous: at least two backdrop corners for every layer in every combination
		expect(r.materialChecks).toBeGreaterThanOrEqual(r.combinations * MATERIAL_LAYERS.length * 2);
	});

	it('8. the real files pass', () => {
		expect((check() as { problems: string[] }).problems).toEqual([]);
	});

	it('every material utility has a layer, and every layer names a backdrop set, text and marks', () => {
		const utilities = readFileSync('src/styles/utilities.css', 'utf8');
		const used = [...utilities.matchAll(/@utility (material-(?:bar|glass|milk|sidebar)) \{/g)].map(
			(m) => m[1]
		);
		expect(used.sort()).toEqual([
			'material-bar',
			'material-glass',
			'material-milk',
			'material-sidebar'
		]);
		type L = { layer: string; fill: string; backdrops: string[]; text: string[]; marks: string[] };
		for (const u of used)
			expect(
				(MATERIAL_LAYERS as L[]).some((l) => l.fill === `${u}-fill`),
				u
			).toBe(true);
		expect((MATERIAL_LAYERS as L[]).map((l) => l.layer)).toEqual([
			'topbar',
			'hnav',
			'bulk-bar',
			'sidebar-desktop',
			'sidebar-mobile',
			'overlay',
			'float',
			'auth-card'
		]);
		for (const l of MATERIAL_LAYERS as L[]) {
			expect(l.backdrops.length, l.layer).toBeGreaterThan(0);
			expect(l.text.length + l.marks.length, l.layer).toBeGreaterThan(0);
			expect(
				l.backdrops.some((b) => b === '#000' || b.startsWith('primary')),
				l.layer
			).toBe(true);
		}
	});

	it('the real overlay and mobile sidebar sit under the scrim, the bar does not', () => {
		const by = (n: string) =>
			(MATERIAL_LAYERS as Array<{ layer: string; under?: string }>).find((l) => l.layer === n)!;
		expect(by('overlay').under).toBe('scrim');
		expect(by('sidebar-mobile').under).toBe('scrim');
		expect(by('topbar').under).toBeUndefined();
	});
});

describe('Pebble World materials in the gate (Task 3)', () => {
	it('a solid layer (milk) is not held to the glass limit, but must not rely on a filter', () => {
		// 95% is not glass: the glass check would reject it ...
		expect(gate(base('', 95), layer()).problems.join('\n')).toContain('is not glass');
		// ... a solid layer is exempt from that, and is held to filter tokens of 1 instead
		expect(gate(base('', 95), layer({ solid: true })).problems).toEqual([]);
		const problems = gate(base('--bar-con: 0.6;', 95), layer({ solid: true })).problems.join('\n');
		expect(problems).toContain('bar-con is not 1');
		expect(problems).toContain('never blurs');
	});

	it('the real milk layers are solid, the glass layers are not, and the auth card is large glass', () => {
		type L = { layer: string; fill: string; solid?: boolean };
		const layers = MATERIAL_LAYERS as L[];
		for (const l of layers.filter((x) => x.fill === 'material-milk-fill'))
			expect(l.solid, l.layer).toBe(true);
		for (const l of layers.filter((x) => x.fill !== 'material-milk-fill'))
			expect(l.solid, l.layer).toBeUndefined();
		expect(layers.find((l) => l.layer === 'auth-card')!.fill).toBe('material-glass-fill');
	});

	it('PEBBLE_TOP is the --pebble-top-mix of materials.css', () => {
		const css = readFileSync('src/styles/theme/materials.css', 'utf8');
		const mix = /--pebble-top-mix:\s*(\d+)%/.exec(css)![1];
		expect(PEBBLE_TOP).toBeCloseTo(Number(mix) / 100, 6);
	});

	it('every app colour is measured on the glossy top of its pebble, at 3:1', () => {
		const pebble = (
			PAIRS as Array<{ fg: string; bg: string; min: number; alpha?: number; over?: string }>
		).filter((p) => p.alpha === PEBBLE_TOP);
		// the mix target is the same token the paint mixes toward (`--pebble-light`)
		for (const p of pebble) expect(p.over, p.bg).toBe('pebble-light');
		expect(pebble.map((p) => p.bg).sort()).toEqual(
			(PAIRS as Array<{ fg: string; bg: string; alpha?: number }>)
				// the glyph on an app colour (not the white L against the pebble's K, which has its own pair)
				.filter((p) => p.fg === 'app-glyph' && p.alpha === undefined && p.bg.startsWith('app-'))
				.map((p) => p.bg)
				.sort()
		);
		expect(pebble.length).toBeGreaterThanOrEqual(11);
		for (const p of pebble) expect(p.min, p.bg).toBe(3);
	});

	const realFiles = (mutate: (name: string, css: string) => string) =>
		['palettes', 'semantic', 'materials', 'layouts'].map(
			(n) =>
				[
					`src/styles/theme/${n}.css`,
					mutate(n, readFileSync(`src/styles/theme/${n}.css`, 'utf8'))
				] as [string, string]
		);

	it('mutation: the unmodified Leads orange (the reference value) fails on the pebble top', () => {
		const files = realFiles((n, css) =>
			n === 'palettes'
				? css.replace(
						'--app-leads: oklch(0.61 0.1644 47.51)',
						'--app-leads: oklch(0.6398 0.1644 47.51)'
					)
				: css
		);
		const r = checkCss(files, { layers: [] });
		expect(r.problems.join('\n')).toContain('app-glyph on app-leads');
		expect(r.problems.join('\n')).toContain('white glyph on the pebble top');
	});

	it('mutation: a pale field border fails on the trough and on the tray', () => {
		const files = realFiles((n, css) =>
			n === 'semantic'
				? css.replace(
						'--field-border: light-dark(oklch(0.55 0.02 262)',
						'--field-border: light-dark(oklch(0.8 0.02 262)'
					)
				: css
		);
		const text = checkCss(files, { layers: [] }).problems.join('\n');
		expect(text).toContain('field-border on trough');
		expect(text).toContain('field-border on tray');
	});

	it('the focus ring is gated at 3:1 on the wall, the tray and the trough as well as the page and the card', () => {
		const rings = (PAIRS as Array<{ fg: string; bg: string; min: number }>)
			.filter((p) => p.fg === 'focus-ring')
			.map((p) => p.bg)
			.sort();
		expect(rings).toEqual(
			['background', 'card', 'tray', 'trough', 'wall-1', 'wall-2', 'wall-3'].sort()
		);
	});

	it('the tray and the trough carry the text levels at 4.5', () => {
		const need = (PAIRS as Array<{ fg: string; bg: string; min: number }>).filter(
			(p) => p.bg === 'tray' || p.bg === 'trough'
		);
		for (const bg of ['tray', 'trough'])
			for (const fg of ['foreground', 'muted-foreground'])
				expect(need.find((p) => p.fg === fg && p.bg === bg)?.min, `${fg} on ${bg}`).toBe(4.5);
	});
});

describe('material-bound: the pure bound', () => {
	it('saturate(1) is the identity and saturate(0) is the luma gray', () => {
		expect(applySaturate({ mode: 'rgb', r: 0.2, g: 0.5, b: 0.9 }, 1)).toEqual({
			mode: 'rgb',
			r: 0.2,
			g: 0.5,
			b: 0.9
		});
		const g = applySaturate({ mode: 'rgb', r: 0.2, g: 0.5, b: 0.9 }, 0) as {
			r: number;
			g: number;
			b: number;
		};
		expect(g.r).toBeCloseTo(g.g, 6);
		expect(g.g).toBeCloseTo(g.b, 6);
	});
	it('contrast(0.6) maps 0..1 into 0.2..0.8', () => {
		expect(contrastChannel(0, 0.6)).toBeCloseTo(0.2, 6);
		expect(contrastChannel(1, 0.6)).toBeCloseTo(0.8, 6);
		expect(contrastChannel(0.5, 0.6)).toBeCloseTo(0.5, 6);
	});
	it('the corners of black and white after contrast(0.6) are 0.2 and 0.8 per channel', () => {
		const cs = corners(['#000000', '#ffffff'], 1.8, 0.6) as Array<{
			side: string;
			color: { r: number };
		}>;
		expect(cs).toHaveLength(2); // sRGB only: CSS filter functions have no linearRGB variant (GD19)
		for (const c of cs) expect(c.color.r).toBeCloseTo(c.side === 'lo' ? 0.2 : 0.8, 6);
	});
});
