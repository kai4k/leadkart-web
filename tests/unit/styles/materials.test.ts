/**
 * The material layer (plan G2), read as text: no browser. materials.css defines the glass; its
 * fallbacks must all resolve to the SAME opaque `off` declarations; the three `material-*` utilities
 * read only declared tokens.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');
const MATERIALS = read('src/styles/theme/materials.css');
const FALLBACKS = read('src/styles/theme/materials-fallbacks.css');
const UTILITIES = read('src/styles/utilities.css');
const TOKENS = read('src/styles/tokens.css');

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function decls(body: string): Map<string, string> {
	const out = new Map<string, string>();
	for (const d of body.split(';')) {
		const i = d.indexOf(':');
		if (i < 0) continue;
		const name = d.slice(0, i).trim();
		if (name)
			out.set(
				name,
				d
					.slice(i + 1)
					.replace(/\s+/g, ' ')
					.trim()
			);
	}
	return out;
}

/** Top-level flat rules: selector -> declarations. */
function flatRules(css: string): Array<{ selector: string; decls: Map<string, string> }> {
	return [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
		selector: m[1].trim(),
		decls: decls(m[2])
	}));
}

/** `@supports ... { :root:root { … } }` -> the at-rule prelude and the inner declarations. */
function atRules(css: string): Array<{ at: string; selector: string; decls: Map<string, string> }> {
	return [...strip(css).matchAll(/(@[^{]+)\{\s*([^{}]+)\{([^{}]*)\}\s*\}/g)].map((m) => ({
		at: m[1].trim(),
		selector: m[2].trim(),
		decls: decls(m[3])
	}));
}

const rules = flatRules(MATERIALS);
const root = rules.find((r) => r.selector === ':root')!.decls;
const reduced = rules.find((r) => r.selector === ":root[data-transparency='reduced']")!.decls;
const off = rules.find((r) => r.selector === ":root[data-transparency='off']")!.decls;

describe('materials.css', () => {
	it('is flat: only :root rules, no @media, no nesting', () => {
		const text = strip(MATERIALS);
		expect(text).not.toMatch(/@media|@supports/);
		for (const r of rules)
			expect(r.selector, r.selector).toMatch(/^:root(\[data-[a-z-]+='[^']*'\])*$/);
		// no nested braces: every rule body is brace-free (flatRules would have skipped it otherwise)
		expect((text.match(/\{/g) ?? []).length).toBe(rules.length);
	});

	it('every glass fill is a neutral surface at an alpha below 90% (not nearly opaque)', () => {
		const fills = [...root].filter(([n]) => /^--material-(bar|pane|sidebar)-fill$/.test(n));
		expect(fills.map(([n]) => n).sort()).toEqual([
			'--material-bar-fill',
			'--material-pane-fill',
			'--material-sidebar-fill'
		]);
		for (const [name, value] of fills) {
			const shares = [
				...value.matchAll(
					/color-mix\(in srgb, var\(--(card|popover|sidebar)\) (\d+)%, transparent\)/g
				)
			];
			expect(shares, name).toHaveLength(2); // light and dark
			for (const m of shares) expect(Number(m[2]), name).toBeLessThan(90);
		}
	});

	it('the reduced (Tinted) level is frostier: every fill 90-95%, same surfaces', () => {
		for (const name of ['--material-bar-fill', '--material-pane-fill', '--material-sidebar-fill']) {
			const shares = [...reduced.get(name)!.matchAll(/(\d+)%, transparent/g)].map((m) =>
				Number(m[1])
			);
			expect(shares, name).toHaveLength(2);
			for (const n of shares) expect(n >= 90 && n <= 95, `${name} ${n}`).toBe(true);
		}
	});

	it('the off block is opaque: an opaque value for every fill, none for every filter', () => {
		expect(off.get('--material-bar-fill')).toBe('var(--card)');
		expect(off.get('--material-pane-fill')).toBe('var(--popover)');
		expect(off.get('--material-sidebar-fill')).toBe('var(--sidebar)');
		expect(off.get('--material-bar-filter')).toBe('none');
		expect(off.get('--material-pane-filter')).toBe('none');
		for (const n of ['saturate', 'contrast'])
			for (const m of ['bar', 'pane']) expect(off.get(`--material-${m}-${n}`)).toBe('1');
		expect(off.get('--material-control')).toBe('var(--muted)');
		expect(off.get('--material-control-hover')).toBe('var(--accent)');
	});

	it('declares the pane blur at 24px, the bar at 16px, and no scroll-edge fade', () => {
		expect(root.get('--material-pane-blur')).toBe('24px');
		expect(root.get('--material-bar-blur')).toBe('16px');
		expect(MATERIALS).not.toContain('--material-edge-fade');
		expect(UTILITIES).not.toContain('--material-edge-fade');
	});

	it('luminosity compression is below 1 and saturate above 1 on both recipes', () => {
		for (const m of ['bar', 'pane']) {
			expect(Number(root.get(`--material-${m}-contrast`))).toBeLessThan(1);
			expect(Number(root.get(`--material-${m}-saturate`))).toBeGreaterThan(1);
		}
	});

	it('the scrim dims only: 35% light, 55% dark, no blur', () => {
		expect(root.get('--scrim')).toContain('black 35%');
		expect(root.get('--scrim')).toContain('black 55%');
		expect(TOKENS).toContain('--color-scrim: var(--scrim)');
	});
});

describe('materials-fallbacks.css', () => {
	const blocks = atRules(FALLBACKS);
	const named = (needle: string) => blocks.find((b) => b.at.includes(needle))!;

	it('has the five whole-surface fallbacks and the coarse-pointer one', () => {
		expect(blocks.map((b) => b.at)).toEqual([
			'@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
			'@media (prefers-reduced-transparency: reduce)',
			'@media (prefers-contrast: more)',
			'@media (forced-colors: active)',
			'@media print',
			'@media (pointer: coarse)'
		]);
	});

	it.each([
		['@supports not'],
		['prefers-reduced-transparency'],
		['prefers-contrast'],
		['forced-colors'],
		['@media print']
	])('%s repeats every declaration of the off block with the identical value', (needle) => {
		const b = named(needle);
		expect(b.selector).toBe(':root:root');
		for (const [name, value] of off) expect(b.decls.get(name), `${needle} ${name}`).toBe(value);
	});

	it('increased contrast also swaps the edge for the 3:1 border and drops the highlight', () => {
		const b = named('prefers-contrast');
		expect(b.decls.get('--material-edge')).toBe('var(--input)');
		expect(b.decls.get('--material-highlight')).toBe('transparent');
	});

	it('print drops the shadows', () => {
		const b = named('@media print');
		expect(b.decls.get('--material-bar-shadow')).toBe('none');
		expect(b.decls.get('--material-pane-shadow')).toBe('none');
	});

	it('coarse pointer: panes and sidebar opaque, bars keep glass at a 12px blur, and `off` is untouched', () => {
		const b = named('pointer: coarse');
		expect(b.selector).toBe(":root:root:not([data-transparency='off'])");
		for (const n of [
			'--material-pane-fill',
			'--material-sidebar-fill',
			'--material-pane-filter',
			'--material-pane-saturate',
			'--material-pane-contrast'
		])
			expect(b.decls.get(n), n).toBe(off.get(n));
		expect(b.decls.get('--material-bar-blur')).toBe('12px');
		expect(b.decls.has('--material-bar-fill')).toBe(false);
	});
});

describe('the material utilities', () => {
	const declared = new Set([...root.keys(), ...reduced.keys(), ...off.keys()]);

	it('defines the three utilities, each reading its own fill and filter', () => {
		for (const [name, fill, filter] of [
			['material-bar', 'bar-fill', 'bar-filter'],
			['material-pane', 'pane-fill', 'pane-filter'],
			['material-sidebar', 'sidebar-fill', 'pane-filter']
		]) {
			const m = new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`).exec(UTILITIES);
			expect(m, name).not.toBeNull();
			expect(m![1]).toContain(`background-color: var(--material-${fill})`);
			expect(m![1]).toContain(`backdrop-filter: var(--material-${filter})`);
			expect(m![1]).toContain('-webkit-backdrop-filter');
			expect(m![1]).toContain('forced-colors: active');
		}
	});

	it('reads only material tokens that materials.css declares', () => {
		const used = [...strip(UTILITIES).matchAll(/var\((--material-[\w-]+)\)/g)].map((m) => m[1]);
		expect(used.length).toBeGreaterThan(10);
		for (const u of used) expect(declared.has(u) || u.startsWith('--material-'), u).toBe(true);
		for (const u of used) expect(declared, u).toContain(u);
	});

	it('a float opened over an open modal surface is opaque (no glass on glass)', () => {
		expect(UTILITIES).toMatch(/\[data-slot='dialog-content'\]/);
		expect(UTILITIES).toMatch(/\[data-slot='dropdown-menu-content'\]/);
		expect(UTILITIES).toMatch(
			/background-color: var\(--popover\);\s*-webkit-backdrop-filter: none;\s*backdrop-filter: none;/
		);
	});
});
