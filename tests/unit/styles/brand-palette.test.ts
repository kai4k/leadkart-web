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
