/**
 * The four palettes of the logo (spec 4.1): iris (the default), ocean, coral, emerald. Each ramp is
 * generated from the logo hexes, so the anchor steps must land on them (oklab distance, ΔE <= 2), and
 * the logo follows the palette: the L is the brand colour, the K the palette's second piece.
 */
import { readFileSync } from 'node:fs';
// @ts-expect-error culori ships no types
import { converter, parse } from 'culori';
import { describe, expect, it } from 'vitest';

const PALETTES = readFileSync('src/styles/theme/palettes.css', 'utf8');
const SEMANTIC = readFileSync('src/styles/theme/semantic.css', 'utf8');
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const PALETTE_NAMES = ['iris', 'ocean', 'coral', 'emerald'] as const;
const NON_DEFAULT = ['ocean', 'coral', 'emerald'] as const;

/** Spec 4.1: logo fill (500), button step (600), brand as text (700), ink on soft (900), the K (k-500). */
const HEXES = {
	iris: { 500: '#6c5ce7', 600: '#6252e0', 700: '#5646d4', 900: '#2c2380', k500: '#10b3c7' },
	ocean: { 500: '#2f6fe0', 600: '#2a66d4', 700: '#2259c2', 900: '#123c86', k500: '#16b386' },
	coral: { 500: '#ec5a36', 600: '#cc4420', 700: '#b63a18', 900: '#7d2a12', k500: '#f2a00a' },
	emerald: { 500: '#12996b', 600: '#0d7f58', 700: '#0b6e4c', 900: '#0c5239', k500: '#e8a20c' }
} as const;

const oklab = converter('oklab');
/** ΔE in oklab, on the usual 0-100 scale. */
const deltaE = (a: string, b: string) => {
	const x = oklab(parse(a)!);
	const y = oklab(parse(b)!);
	return 100 * Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
};
const declared = (css: string, name: string): string | undefined =>
	new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1].trim();
const block = (css: string, selector: string): string => {
	const start = css.indexOf(`${selector} {`);
	return start < 0 ? '' : css.slice(start, css.indexOf('}', start));
};

describe('the four palette ramps', () => {
	it('declares eleven brand steps and eleven K steps for every palette', () => {
		for (const p of PALETTE_NAMES)
			for (const step of STEPS) {
				expect(declared(PALETTES, `--palette-${p}-${step}`), `${p}-${step}`).toBeDefined();
				expect(declared(PALETTES, `--palette-${p}-k-${step}`), `${p}-k-${step}`).toBeDefined();
			}
	});

	it('lands the anchor steps on the spec hexes (logo fill, button, text, ink) within ΔE 2', () => {
		for (const p of PALETTE_NAMES)
			for (const step of [500, 600, 700, 900] as const) {
				const value = declared(PALETTES, `--palette-${p}-${step}`)!;
				expect(deltaE(value, HEXES[p][step]), `${p}-${step} ${value}`).toBeLessThanOrEqual(2);
			}
	});

	it('lands the K on the logo second piece within ΔE 2', () => {
		for (const p of PALETTE_NAMES) {
			const value = declared(PALETTES, `--palette-${p}-k-500`)!;
			expect(deltaE(value, HEXES[p].k500), `${p}-k-500 ${value}`).toBeLessThanOrEqual(2);
		}
	});

	it('keeps none of the retired ramps, the capsule or the extra dark-neutral families', () => {
		expect(PALETTES).not.toMatch(
			/--palette-(leadkart|green|violet|orange|teal|fuchsia|lime|amber|capsule)-/
		);
		expect(PALETTES).not.toMatch(/--neutral-(zinc|stone|neutral|gray)-/);
		expect(PALETTES + SEMANTIC).not.toMatch(/palette-capsule|data-colors|data-dark-palette/);
	});

	it('writes every brand step in oklch', () => {
		for (const p of PALETTE_NAMES)
			for (const step of STEPS)
				expect(declared(PALETTES, `--palette-${p}-${step}`)).toMatch(/^oklch\(/);
	});
});

describe('the semantic palette switch', () => {
	it('iris is the default in :root: --primary-N and --brand-2-N point at it', () => {
		const root = SEMANTIC.slice(0, SEMANTIC.indexOf(":root[data-mode='dark']"));
		for (const step of STEPS) {
			expect(root).toContain(`--primary-${step}: var(--palette-iris-${step});`);
			expect(root).toContain(`--brand-2-${step}: var(--palette-iris-k-${step});`);
		}
	});

	it('every other palette re-points --primary-N and --brand-2-N to its own ramps', () => {
		for (const p of NON_DEFAULT) {
			const b = block(SEMANTIC, `:root[data-palette='${p}']`);
			expect(b, p).not.toBe('');
			for (const step of STEPS) {
				expect(b, `${p} primary ${step}`).toContain(
					`--primary-${step}: var(--palette-${p}-${step});`
				);
				expect(b, `${p} brand-2 ${step}`).toContain(
					`--brand-2-${step}: var(--palette-${p}-k-${step});`
				);
			}
		}
	});

	it('has no block for the retired colour axis and none for iris (the default)', () => {
		expect(SEMANTIC).not.toContain("[data-colors='");
		expect(SEMANTIC).not.toContain(":root[data-palette='iris']");
	});

	it('the role names the spec lists exist as light-dark pairs or aliases', () => {
		for (const token of [
			'--brand-2',
			'--brand-2-soft',
			'--primary-tonal',
			'--primary-tonal-foreground',
			'--field-border',
			'--meter-track',
			'--focus-ring',
			'--badge-count',
			'--badge-count-foreground',
			'--wall-1',
			'--wall-2',
			'--wall-3',
			'--app-accent'
		])
			expect(SEMANTIC, token).toMatch(new RegExp(`\\n\\t${token}:`));
	});
});

describe('the logo follows the palette', () => {
	it('the L is the brand colour (step 500) and the K is the second piece', () => {
		expect(SEMANTIC).toContain('--brand-frame-light: var(--primary-500);');
		expect(SEMANTIC).toContain('--brand-capsule-light: var(--brand-2-500);');
		expect(SEMANTIC).toContain('--brand-capsule-dark: var(--brand-2-300);');
	});

	it('the bar logo is a step deeper (frame 700, K 600) so it keeps its floors on a translucent bar', () => {
		expect(SEMANTIC).toContain('--brand-frame-bar-light: var(--primary-700);');
		expect(SEMANTIC).toContain('--brand-capsule-bar-light: var(--brand-2-600);');
	});

	it('dark sidebars use the dark frame, not primary-200', () => {
		expect(SEMANTIC).not.toContain('--sidebar-brand-frame: var(--primary-200);');
	});

	it('the page colour wash is three tokens with dark steps in dark mode', () => {
		for (const t of ['--page-wash-start', '--page-wash-end', '--page-wash-top'])
			expect(SEMANTIC, t).toContain(`${t}: light-dark(`);
		expect(SEMANTIC).toContain('color-mix(in srgb, var(--primary-900) 55%, transparent)');
	});
});

describe('the app identity colours', () => {
	it('declares one colour per app, Home following the brand', () => {
		for (const app of [
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
			expect(declared(PALETTES, `--app-${app}`), app).toMatch(/^oklch\(/);
		expect(SEMANTIC).toContain('--app-home: var(--primary-600);');
	});

	it('each app scope points --app-accent at its own colour', () => {
		const utilities = readFileSync('src/styles/utilities.css', 'utf8');
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
			expect(utilities).toContain(`.app-${app} {\n\t--app-accent: var(--app-${app});\n}`);
	});
});
