/**
 * Kart Blue is the default primary and the logo follows the palette: the `leadkart` ramp holds the
 * logo's hexes at 400-700, no old logo purple is left, and every primary palette declares its own
 * logo steps (a palette without them would inherit the Kart Blue / teal pair and clash).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PALETTES = readFileSync('src/styles/theme/palettes.css', 'utf8');
const SEMANTIC = readFileSync('src/styles/theme/semantic.css', 'utf8');
const COLOURS = ['green', 'violet', 'orange', 'teal', 'fuchsia', 'lime', 'amber'];

describe('Kart Blue ramp', () => {
	it('anchors the leadkart palette on the logo hexes', () => {
		for (const [step, hex] of [
			[400, '#60a5fa'],
			[500, '#3b82f6'],
			[600, '#2563eb'],
			[700, '#1d4ed8']
		] as const)
			expect(PALETTES).toContain(`--palette-leadkart-${step}: ${hex};`);
	});

	it('declares all eleven steps', () => {
		for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
			expect(PALETTES).toMatch(new RegExp(`--palette-leadkart-${step}:`));
	});

	it('keeps no trace of the old purple', () => {
		expect(PALETTES + SEMANTIC).not.toMatch(/502d81|953fc9|1e1043/i);
		expect(PALETTES).not.toMatch(/--palette-leadkart-\d+: oklch\([^)]* 296\)/);
	});

	it('has Capsule Teal for the default capsule', () => {
		expect(PALETTES).toContain('--palette-capsule-500: #14b8a6;');
		expect(PALETTES).toContain('--palette-capsule-300: #5eead4;');
	});
});

describe('the logo follows the palette', () => {
	it('every non-default primary palette declares its own frame and capsule', () => {
		for (const colour of COLOURS) {
			const start = SEMANTIC.indexOf(`:root[data-colors='${colour}'] {`);
			expect(start, colour).toBeGreaterThan(-1);
			const block = SEMANTIC.slice(start, SEMANTIC.indexOf('}', start));
			for (const token of ['--brand-frame-light', '--brand-capsule-light', '--brand-capsule-dark'])
				expect(block, `${colour} ${token}`).toContain(`${token}: var(--primary-`);
		}
	});

	it('only the default palette uses Capsule Teal', () => {
		for (const colour of COLOURS) {
			const start = SEMANTIC.indexOf(`:root[data-colors='${colour}'] {`);
			expect(SEMANTIC.slice(start, SEMANTIC.indexOf('}', start))).not.toContain('palette-capsule');
		}
		const root = SEMANTIC.slice(0, SEMANTIC.indexOf(':root[data-mode'));
		expect(root).toContain('--brand-capsule-light: var(--palette-capsule-');
	});
});

describe('logo accent tokens (GD21)', () => {
	it('every palette declares its dark frame, and the bar frame and capsule, beside the light steps', () => {
		for (const colour of COLOURS) {
			const start = SEMANTIC.indexOf(`:root[data-colors='${colour}'] {`);
			const block = SEMANTIC.slice(start, SEMANTIC.indexOf('}', start));
			for (const token of [
				'--brand-frame-dark',
				'--brand-capsule-bar-light',
				'--brand-frame-bar-light'
			])
				expect(block, `${colour} ${token}`).toContain(`${token}: var(--`);
		}
	});

	it('the default light capsule is Capsule Teal 500 on opaque surfaces and 600 on the bar', () => {
		expect(SEMANTIC).toContain('--brand-capsule-light: var(--palette-capsule-500);');
		expect(SEMANTIC).toContain('--brand-capsule-bar-light: var(--palette-capsule-600);');
		expect(SEMANTIC).toContain('--brand-capsule-dark: var(--palette-capsule-300);');
	});

	it('dark sidebars use the dark frame, not primary-200', () => {
		expect(SEMANTIC).not.toContain('--sidebar-brand-frame: var(--primary-200);');
		expect(SEMANTIC.match(/--sidebar-brand-frame: var\(--brand-frame-dark\);/g)).toHaveLength(4);
	});

	it('the page colour wash is three tokens with dark steps in dark mode', () => {
		for (const t of ['--page-wash-start', '--page-wash-end', '--page-wash-top'])
			expect(SEMANTIC, t).toContain(`${t}: light-dark(`);
		expect(SEMANTIC).toContain('color-mix(in srgb, var(--primary-900) 55%, transparent)');
	});
});
