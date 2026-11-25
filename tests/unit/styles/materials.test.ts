/**
 * The material layer (plan G2), read as text: no browser. materials.css defines the glass; its
 * fallbacks must all resolve to the SAME opaque `off` declarations; the three `material-*` utilities
 * read only declared tokens.
 */
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
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
		const fills = [...root].filter(([n]) => /^--material-(bar|glass|sidebar)-fill$/.test(n));
		expect(fills.map(([n]) => n).sort()).toEqual([
			'--material-bar-fill',
			'--material-glass-fill',
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
		for (const name of [
			'--material-bar-fill',
			'--material-glass-fill',
			'--material-sidebar-fill'
		]) {
			const shares = [...reduced.get(name)!.matchAll(/(\d+)%, transparent/g)].map((m) =>
				Number(m[1])
			);
			expect(shares, name).toHaveLength(2);
			for (const n of shares) expect(n >= 90 && n <= 95, `${name} ${n}`).toBe(true);
		}
	});

	it('milk is near-opaque (95-96%, 97-98% when reduced), over the popover surface, and never blurs', () => {
		const share = (v: string) =>
			[...v.matchAll(/var\(--popover\) (\d+)%, transparent/g)].map((m) => Number(m[1]));
		expect(share(root.get('--material-milk-fill')!)).toEqual([95, 96]);
		expect(share(reduced.get('--material-milk-fill')!)).toEqual([97, 98]);
		// the two numbers the gate reads for the layer: no saturation, no compression, and no filter token at all
		expect(root.get('--material-milk-saturate')).toBe('1');
		expect(root.get('--material-milk-contrast')).toBe('1');
		expect(root.has('--material-milk-filter')).toBe(false);
	});

	it('the solid materials are drawn from shadow tokens declared here, each a list the box-shadow can take', () => {
		for (const n of [
			'--shadow-clay',
			'--shadow-clay-sm',
			'--shadow-pebble',
			'--shadow-inset',
			'--shadow-float',
			'--shadow-sheet',
			'--shadow-tray'
		]) {
			expect(root.has(n), n).toBe(true);
			expect(root.get(n), n).not.toMatch(/^none$/);
		}
		// clay: an outer drop, a belly shade and a top light, in that order (reference --up)
		expect(root.get('--shadow-clay')).toMatch(
			/^0 10px 20px -12px .*inset 0 -3px 6px .*inset 0 2px 2px /
		);
		expect(root.get('--shadow-clay-sm')).toMatch(/inset 0 -2px 3px .*inset 0 1\.5px 1px /);
		expect(root.get('--pebble-top-mix')).toBe('82%');
	});

	it('the off block is opaque: an opaque value for every fill, none for every filter', () => {
		expect(off.get('--material-bar-fill')).toBe('var(--card)');
		expect(off.get('--material-milk-fill')).toBe('var(--popover)');
		expect(off.get('--material-glass-fill')).toBe('var(--popover)');
		expect(off.get('--material-sidebar-fill')).toBe('var(--sidebar)');
		expect(off.get('--material-bar-filter')).toBe('none');
		expect(off.get('--material-glass-filter')).toBe('none');
		for (const n of ['saturate', 'contrast'])
			for (const m of ['bar', 'glass']) expect(off.get(`--material-${m}-${n}`)).toBe('1');
		expect(off.get('--material-control')).toBe('var(--muted)');
		expect(off.get('--material-control-hover')).toBe('var(--accent)');
	});

	it('declares the large-glass blur at 24px, the bar at 16px, no pane recipe any more, and no scroll-edge fade', () => {
		expect(root.get('--material-glass-blur')).toBe('24px');
		expect(root.get('--material-bar-blur')).toBe('16px');
		expect(MATERIALS).not.toMatch(/--material-pane/);
		expect(MATERIALS).not.toContain('--material-edge-fade');
		expect(UTILITIES).not.toContain('--material-edge-fade');
	});

	it('luminosity compression is below 1 and saturate above 1 on both glass recipes', () => {
		for (const m of ['bar', 'glass']) {
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

	it('a fallback block may add only the pinned extras: its keys are a subset of the off keys plus edge, highlight and shadows', () => {
		const PINNED = [
			'--material-edge',
			'--material-highlight',
			'--material-bar-shadow',
			'--material-milk-shadow',
			'--material-glass-shadow'
		];
		const allowed = new Set([...off.keys(), ...PINNED]);
		for (const needle of [
			'@supports not',
			'prefers-reduced-transparency',
			'prefers-contrast',
			'forced-colors',
			'@media print'
		])
			for (const key of named(needle).decls.keys())
				expect(allowed.has(key), `${needle} declares ${key}, which the gate never reads`).toBe(
					true
				);
	});

	it('increased contrast also swaps the edge for the 3:1 border and drops the highlight', () => {
		const b = named('prefers-contrast');
		expect(b.decls.get('--material-edge')).toBe('var(--input)');
		expect(b.decls.get('--material-highlight')).toBe('transparent');
	});

	it('print drops the shadows but never to `none` (that would invalidate the box-shadow list and the edge with it)', () => {
		const b = named('@media print');
		expect(b.decls.get('--material-bar-shadow')).toBe('0 0 transparent');
		expect(b.decls.get('--material-milk-shadow')).toBe('0 0 transparent');
		expect(b.decls.get('--material-glass-shadow')).toBe('0 0 transparent');
		for (const css of [MATERIALS, FALLBACKS])
			for (const m of strip(css).matchAll(/(--material-(?:bar|milk|glass)-shadow):\s*none/g))
				expect.fail(`${m[1]} is none`);
	});

	it('coarse pointer: large glass and the sidebar are opaque, bars keep glass at a 12px blur, milk needs no rule, and `off` is untouched', () => {
		const b = named('pointer: coarse');
		expect(b.selector).toBe(":root:root:not([data-transparency='off'])");
		for (const n of [
			'--material-glass-fill',
			'--material-sidebar-fill',
			'--material-glass-filter',
			'--material-glass-saturate',
			'--material-glass-contrast'
		])
			expect(b.decls.get(n), n).toBe(off.get(n));
		expect(b.decls.get('--material-bar-blur')).toBe('12px');
		expect(b.decls.has('--material-bar-fill')).toBe(false);
		expect(b.decls.has('--material-milk-fill')).toBe(false);
	});

	it('clay, pebble, tray and trough keep their shape in every fallback: no block restates or removes their tokens', () => {
		const solid = ['--shadow-', '--clay-', '--pebble-', '--tray', '--trough', '--field-border'];
		for (const key of off.keys())
			expect(
				solid.some((s) => key.startsWith(s)),
				`off declares ${key}`
			).toBe(false);
		for (const b of blocks)
			for (const key of b.decls.keys())
				expect(
					solid.some((s) => key.startsWith(s)),
					`${b.at} declares ${key}`
				).toBe(false);
		// and no glass token leaks into a solid utility (next describe), so degrading glass cannot change them
		expect(FALLBACKS).not.toMatch(/--(shadow|clay|pebble)-/);
	});

	it('every fallback also repeats the milk and large-glass `off` values, so glass and milk degrade together', () => {
		for (const needle of [
			'@supports not',
			'prefers-reduced-transparency',
			'prefers-contrast',
			'forced-colors',
			'@media print'
		]) {
			const b = named(needle);
			expect(b.decls.get('--material-milk-fill'), needle).toBe('var(--popover)');
			expect(b.decls.get('--material-glass-filter'), needle).toBe('none');
		}
	});
});

describe('the material utilities', () => {
	const declared = new Set([...root.keys(), ...reduced.keys(), ...off.keys()]);

	const utility = (name: string) =>
		new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`).exec(UTILITIES)?.[1];

	it('material-milk is the old pane without the blur: its own fill, no backdrop-filter at all, an edge in forced colours', () => {
		const body = utility('material-milk')!;
		expect(body).toContain('background-color: var(--material-milk-fill)');
		expect(body).not.toMatch(/backdrop-filter/);
		expect(body).toContain('var(--material-milk-shadow)');
		expect(body).toContain('forced-colors: active');
		expect(UTILITIES).not.toMatch(/material-pane/);
	});

	it.each(['sheet', 'clay', 'clay-sm', 'pebble', 'tray', 'trough'])(
		'material-%s is solid, has a 1px transparent border (the forced-colours edge) and no filter',
		(m) => {
			const body = utility(`material-${m}`)!;
			expect(body, m).not.toBeUndefined();
			expect(body).toMatch(/^\s*border: 1px solid transparent;$/m);
			expect(body).not.toMatch(/backdrop-filter|--material-/);
			expect(body).toMatch(/box-shadow:/);
		}
	);

	it('each solid material reads the shadow token of its recipe', () => {
		expect(utility('material-clay')).toContain('var(--shadow-clay)');
		expect(utility('material-clay-sm')).toContain('var(--shadow-clay-sm)');
		expect(utility('material-pebble')).toContain('var(--shadow-pebble)');
		expect(utility('material-sheet')).toContain('var(--shadow-sheet)');
		expect(utility('material-tray')).toContain('var(--shadow-tray)');
		expect(utility('material-trough')).toContain('var(--shadow-inset)');
	});

	it('the trough draws its field border inside the pit, from the --field-border role', () => {
		expect(utility('material-trough')).toMatch(/inset 0 0 0 1px var\(--field-border\)/);
		expect(utility('material-trough')).toContain('background-color: var(--trough)');
		expect(utility('material-tray')).toContain('background-color: var(--tray)');
	});

	it('the pebble is the app colour lit from above: a gradient from --app-accent, a white glyph, a squircle', () => {
		const body = utility('material-pebble')!;
		expect(body).toContain('var(--app-accent) var(--pebble-top-mix)');
		expect(body).toContain('color: var(--app-glyph)');
		expect(body).toContain('border-radius: var(--radius-pebble)');
		// the 1px transparent border must not tile the far end of the gradient into the edge
		expect(body).toContain('background-origin: border-box');
	});

	it('defines the four glass utilities, each reading its own fill and filter', () => {
		for (const [name, fill, filter] of [
			['material-bar', 'bar-fill', 'bar-filter'],
			['material-glass', 'glass-fill', 'glass-filter'],
			['material-sidebar', 'sidebar-fill', 'glass-filter'],
			['material-sidebar-bar', 'sidebar-fill', 'bar-filter']
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

	it('milk never blurs, so no toast-over-modal override exists; and no !important sits outside a layer', () => {
		const root = postcss.parse(UTILITIES);
		root.walkRules((r) => {
			expect(r.selector, 'a toast override').not.toContain('[data-sonner-toast]');
		});
		// no unlayered !important rule in the styles folder (it would lose to a layered one)
		for (const f of ['utilities', 'tokens', 'base', 'layout', 'typography', 'animations']) {
			postcss.parse(read(`src/styles/${f}.css`)).walkDecls((d) => {
				if (!d.important) return;
				let p: postcss.Container | postcss.Document | undefined = d.parent;
				let layered = false;
				while (p) {
					if ((p as postcss.AtRule).type === 'atrule' && (p as postcss.AtRule).name === 'layer')
						layered = true;
					p = (p as postcss.Node).parent;
				}
				expect(layered, `${f}.css: !important ${d.prop} outside a layer`).toBe(true);
			});
		}
	});

	it('no glass on glass: a glass element in another glass element is opaque and falls back to ITS OWN surface; milk is no outer or inner case', () => {
		const rules2: Array<{ selector: string; body: string }> = [];
		postcss.parse(UTILITIES).walkRules((r) => {
			if (r.selector.includes('.material-') && r.selector.includes(':is(.material-bar'))
				rules2.push({
					selector: r.selector.replace(/\s+/g, ' '),
					body: r.nodes.map(String).join(';')
				});
		});
		const by = (inner: string) =>
			rules2.find((r) => r.selector.includes(`) .${inner}`) || r.selector.endsWith(`.${inner}`));
		const OUTER = ':is(.material-bar, .material-glass, .material-sidebar, .material-sidebar-bar)';
		for (const [inner, fill] of [
			['material-bar', '--card'],
			['material-glass', '--popover'],
			['material-sidebar', '--sidebar'],
			['material-sidebar-bar', '--sidebar']
		] as const) {
			const r = by(inner)!;
			expect(r, inner).toBeTruthy();
			expect(r.selector, inner).toContain(`${OUTER} .${inner}`);
			expect(r.body).toContain(`background-color: var(${fill})`);
			expect(r.body).toContain('backdrop-filter: none');
		}
		// milk (menus, popovers, toasts, dialogs) never blurs, so there is no "over an open modal" rule for it
		expect(rules2.find((r) => r.selector.includes("[data-slot='dialog-content']"))).toBeUndefined();
		expect(rules2.find((r) => r.selector.includes('material-milk'))).toBeUndefined();
	});

	it('every material utility that paints text re-declares --primary-text to a step gated on it', () => {
		for (const [name, token] of [
			['material-bar', '--material-primary-text'],
			['material-glass', '--material-primary-text'],
			['material-milk', '--material-primary-text'],
			['material-sidebar', '--sidebar-accent-foreground'],
			['material-sidebar-bar', '--sidebar-accent-foreground']
		] as const) {
			const m = new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`).exec(UTILITIES)!;
			expect(m[1], name).toContain(`--primary-text: var(${token})`);
		}
		expect(root.has('--material-primary-text')).toBe(true);
	});

	it('the auth card is glass always: no override turns it opaque (GD22); the backdrop is static instead', () => {
		let override = false;
		postcss.parse(UTILITIES).walkRules((r) => {
			if (r.selector.includes('lk-auth-card')) override = true;
		});
		expect(override).toBe(false);
		expect(UTILITIES).not.toMatch(/prefers-reduced-motion: no-preference/);
	});
});
