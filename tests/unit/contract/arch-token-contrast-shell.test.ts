/**
 * Fix round D: the material gate checks what the shell really renders. Layer declarations (what each
 * layer checks), the soundness of the two-corner bound, the five mutants of the gate (each killed by one
 * fixture), and the tie between the `material-*` utilities' scoped re-declarations and the gate's layers.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	MATERIAL_LAYERS,
	PAIRS,
	checkMaterials,
	layerCorners,
	pairRatio
} from '../../../scripts/arch/check-token-contrast.mjs';
import {
	applyContrast,
	applySaturate,
	corners
} from '../../../scripts/arch/lib/material-bound.mjs';
import { base, gate, layer, pair, propsFor } from './material-fixtures.ts';

type Corner = { side: string; color: { r: number; g: number; b: number } };
type Result = {
	layer: string;
	kind: string;
	token: string;
	on: string;
	corner: string;
	ratio: number;
};
type Layer = {
	layer: string;
	fill: string;
	saturate: string;
	contrast: string;
	backdrops: string[];
	text: string[];
	marks: string[];
	onControl?: Array<{ control: string; text: string[] }>;
};

const LAYERS = MATERIAL_LAYERS as unknown as Layer[];
const by = (n: string) => LAYERS.find((l) => l.layer === n)!;
const control = (layerName: string, c: string) =>
	by(layerName).onControl!.find((o) => o.control === c)!;

describe('fix round D: what each layer checks', () => {
	it('1. the bar layers check muted text on the control fill and on its hover fill, and accent text on hover', () => {
		for (const n of ['topbar', 'bulk-bar']) {
			expect(control(n, 'material-control').text).toEqual(
				expect.arrayContaining(['foreground', 'material-muted-foreground'])
			);
			expect(control(n, 'material-control-hover').text).toEqual(
				expect.arrayContaining(['foreground', 'accent-foreground', 'material-muted-foreground'])
			);
		}
	});

	it('1b. muted text that passes on the bare composite but fails on the control fill is reported (the finding)', () => {
		const css = base('--ctl: color-mix(in srgb, var(--text) 30%, transparent);', 72).replace(
			'--bar-con: 1',
			'--bar-con: 0.6'
		);
		expect(gate(css, layer({ text: ['mfg'] })).problems).toEqual([]);
		const onCtl = gate(
			css,
			layer({ text: ['mfg'], onControl: [{ control: 'ctl', text: ['mfg'] }] })
		);
		expect(onCtl.problems.join('\n')).toContain('mfg on ctl on bar-fill');
	});

	it('2. hnav is the sidebar colour on a bar filter: sidebar fill, bar saturate and contrast, bar backdrops, sidebar tokens only', () => {
		const h = by('hnav');
		expect(h.fill).toBe('material-sidebar-fill');
		expect(h.saturate).toBe('material-bar-saturate');
		expect(h.contrast).toBe('material-bar-contrast');
		expect(h.backdrops).toEqual(by('topbar').backdrops);
		expect(h.text).toEqual(
			expect.arrayContaining(['sidebar-foreground', 'sidebar-accent-foreground'])
		);
		expect(h.marks).toEqual(expect.arrayContaining(['sidebar-ring']));
		expect(h.text.concat(h.marks).some((t) => !t.startsWith('sidebar-'))).toBe(false);
	});

	it('7. the overlay and float layers check foreground, muted and accent text on both control fills', () => {
		for (const n of ['overlay', 'float'])
			for (const c of ['material-control', 'material-control-hover'])
				expect(control(n, c).text).toEqual(
					expect.arrayContaining(['foreground', 'material-muted-foreground', 'accent-foreground'])
				);
	});

	it('soundness: a text token INSIDE the backdrop interval fails even though both ends pass', () => {
		const css = base('--mid: #767676; --clear: transparent;');
		const { problems } = gate(
			css,
			layer({ fill: 'clear', text: ['mid'], backdrops: ['#000', '#fff'] })
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('bar: mid on clear');
		expect(problems[0]).toContain('inside the backdrop');
		// outside the interval it is the plain end check
		const dark = gate(
			base('--clear: transparent;'),
			layer({ fill: 'clear', text: ['text'], backdrops: ['#fff', '#ffffff'] })
		);
		expect(dark.problems.join()).not.toContain('inside the backdrop');
	});
});

describe('fix round D: the five mutants of the material gate, each killed by one fixture', () => {
	it('M1 order: saturate THEN contrast (s != 1 and c != 1 together; the swapped order is another colour)', () => {
		const c = { mode: 'rgb' as const, r: 1, g: 0.2, b: 0 };
		const lo = (corners([c], 3, 0.6) as Corner[]).find((x) => x.side === 'lo')!.color;
		const right = applyContrast(applySaturate(c, 3), 0.6);
		const swapped = applySaturate(applyContrast(c, 0.6), 3);
		expect(lo).toEqual(right);
		expect(Math.abs(lo.r - swapped.r)).toBeGreaterThan(0.1);
	});

	it('M2 the onControl loop exists: a pair that fails only on the control fill is reported', () => {
		const css = base('--ctl: color-mix(in srgb, var(--text) 40%, transparent);');
		const { problems } = gate(
			css,
			layer({ text: ['text'], onControl: [{ control: 'ctl', text: ['mfg'] }] })
		);
		expect(problems.join('\n')).toContain('mfg on ctl on bar-fill');
	});

	it('M3 the text is measured on the CONTROL, not on the composite', () => {
		const css = base('--ctl: color-mix(in srgb, var(--text) 40%, transparent);');
		const { results } = checkMaterials(propsFor(css, 'glass'), 'light', 'fx', 'glass', [
			layer({ text: ['mfg'], onControl: [{ control: 'ctl', text: ['mfg'] }] })
		] as never) as { results: Result[] };
		const plain = results.find((r) => r.on === 'bar-fill' && r.corner === 'lo')!;
		const onCtl = results.find((r) => r.on.startsWith('ctl on') && r.corner === 'lo')!;
		expect(onCtl.ratio).toBeLessThan(plain.ratio - 0.5);
	});

	it('M4 the scrim is applied BEFORE the filter (the dim layer sits behind the material)', () => {
		const props = propsFor(base('--con: 0.6;'), 'glass', 'light');
		const cs = layerCorners(
			props as never,
			'light',
			layer({ under: 'scrim', contrast: 'con' }) as never
		) as Corner[];
		// light scrim: black 35% over white = 0.65, then contrast(0.6): (0.65 - 0.5) * 0.6 + 0.5 = 0.59
		// (scrim after the filter would paint 0.8 * 0.65 = 0.52)
		expect(cs.find((c) => c.side === 'hi')!.color.r).toBeCloseTo(0.59, 6);
	});

	it('M5 black-white measures the grayscale, not the colours', () => {
		const css = base('--red: #ff0000; --clear: #ffffff;');
		const props = propsFor(css, 'off', 'black-white');
		const { results } = checkMaterials(props, 'black-white', 'fx', 'off', [
			layer({ fill: 'clear', text: ['red'] })
		] as never) as { results: Result[] };
		// red on white is 4.0:1 in colour; its luma gray (0.2126) is 12.0:1
		expect(results[0].ratio).toBeGreaterThan(11);
		expect(
			pairRatio(pair({ fg: 'red', bg: 'clear' }) as never, props, 'black-white')
		).toBeGreaterThan(11);
	});
});

describe('fix round D: the utilities and the gate describe the same surfaces (item 12)', () => {
	const css = readFileSync('src/styles/utilities.css', 'utf8');
	const utilities = [...css.matchAll(/@utility (material-[\w-]+) \{([\s\S]*?)\n\}/g)];
	/** layers a utility is used on: the fill tells the material, the filter tells bar from pane recipe */
	const layersOf = (u: string) =>
		LAYERS.filter((l) => {
			if (u === 'material-bar') return l.fill === 'material-bar-fill';
			if (u === 'material-pane') return l.fill === 'material-pane-fill';
			const bar = l.saturate === 'material-bar-saturate';
			return l.fill === 'material-sidebar-fill' && (u === 'material-sidebar-bar' ? bar : !bar);
		});
	/** custom properties that carry no contrast pair of their own: none today (a new one needs a reason here) */
	const NO_CONTRAST: Record<string, string> = {};

	it('there are four utilities and each has at least one layer', () => {
		expect(utilities.map((m) => m[1]).sort()).toEqual([
			'material-bar',
			'material-pane',
			'material-sidebar',
			'material-sidebar-bar'
		]);
		for (const [, name] of utilities) expect(layersOf(name).length, name).toBeGreaterThan(0);
	});

	it.each(['material-bar', 'material-pane', 'material-sidebar', 'material-sidebar-bar'])(
		'%s: every re-declared token is gated on each of its layers',
		(name) => {
			const body = utilities.find((m) => m[1] === name)![2];
			const redeclared = [...body.matchAll(/^\s*(--[\w-]+):\s*var\(--([\w-]+)\);/gm)];
			expect(redeclared.length).toBeGreaterThan(4);
			for (const [, prop, token] of redeclared) {
				if (NO_CONTRAST[prop]) continue;
				for (const l of layersOf(name)) {
					const checked = new Set([
						...l.text,
						...l.marks,
						...(l.onControl ?? []).flatMap((o) => [o.control, ...o.text])
					]);
					expect(checked.has(token), `${name}: ${prop} -> ${token} not gated on ${l.layer}`).toBe(
						true
					);
				}
			}
		}
	);

	it('the sidebar utilities read the SIDEBAR tokens, never the neutral material ones (item 3)', () => {
		for (const name of ['material-sidebar', 'material-sidebar-bar']) {
			const body = utilities.find((m) => m[1] === name)![2];
			expect(body).toContain('--ring: var(--sidebar-ring)');
			expect(body).toContain('--muted-foreground: var(--sidebar-muted-foreground)');
			expect(body).toContain('--accent: var(--sidebar-accent)');
			expect(body).not.toMatch(
				/--(muted-foreground|subtle-foreground|ring|muted|accent):\s*var\(--material-/
			);
		}
	});

	it('the pattern topbar scope gates the tokens a material bar would otherwise leak into the band (pattern topbar)', () => {
		const scoped = (PAIRS as Array<{ fg: string; bg: string; scope?: unknown }>).filter(
			(p) => p.scope
		);
		for (const [fg, bg] of [
			['subtle-foreground', 'primary'],
			['primary-indicator', 'primary'],
			['foreground', 'input-fill']
		])
			expect(
				scoped.some((p) => p.fg === fg && p.bg === bg),
				`${fg} on ${bg}`
			).toBe(true);
		const layouts = readFileSync('src/styles/theme/layouts.css', 'utf8');
		const band = /\[data-shell='topbar'\] \{([^}]*)\}/.exec(
			layouts.slice(layouts.indexOf("[data-nav-type='pattern']"))
		)![1];
		for (const d of [
			'backdrop-filter: none',
			'box-shadow: none',
			'--subtle-foreground',
			'--primary-indicator',
			'--input-fill'
		])
			expect(band, d).toContain(d);
	});
});
