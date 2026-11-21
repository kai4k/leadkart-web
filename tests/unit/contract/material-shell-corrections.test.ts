/**
 * Corrections after looking at the glass shell (controller review of fix round D):
 *  a. the light bar is never duller than the page beneath it;
 *  b. the active nav item is a capsule that is seen against the sidebar (gated, non-text floor);
 *  c. the sidebar fill is 84% again, and the two sidebars that needed more (default palette: brand, sky) get their own
 *     logo-frame step instead of a more opaque global material.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error culori ships no types
import { wcagLuminance, converter } from 'culori';
import {
	AXES,
	PAIRS,
	layerCorners,
	MATERIAL_LAYERS,
	parseRules,
	propertiesFor,
	resolveColor,
	themeFiles
} from '../../../scripts/arch/check-token-contrast.mjs';

vi.setConfig({ testTimeout: 30_000 });

const src = (p: string) => readFileSync(p, 'utf8');
const toRgb = converter('rgb') as (c: never) => never;
type Rules = Parameters<typeof propertiesFor>[0];
const rules = (): Rules => {
	let all: Array<Record<string, unknown>> = [];
	for (const f of themeFiles()) {
		const parsed = parseRules(src(f), f, { lenient: f.endsWith('/layouts.css') }).rules;
		all = all.concat(parsed.map((r: object, i: number) => ({ ...r, order: all.length + i })));
	}
	return all as unknown as Rules;
};
const lum = (c: unknown) => wcagLuminance(toRgb(c as never));

describe('a. the light bar is a bright frosted sheet', () => {
	it('over the page colour the bar composite is at least as light as the page, on every palette (light, black-white)', () => {
		const all = rules();
		const layer = {
			...(MATERIAL_LAYERS as unknown as Array<{ layer: string }>).find(
				(l) => l.layer === 'topbar'
			)!,
			backdrops: ['background']
		};
		for (const colors of AXES.colors)
			for (const mode of ['light', 'black-white'] as const) {
				const props = propertiesFor(all, {
					colors,
					mode,
					darkPalette: 'default',
					sidebarColors: 'light',
					transparency: 'glass'
				});
				const page = lum(resolveColor('background', props, mode));
				for (const { color } of layerCorners(props, mode, layer as never)) {
					const bar = lum(resolveColor('material-bar-fill', props, mode, color));
					expect(bar, `${colors}/${mode}`).toBeGreaterThanOrEqual(page - 1e-9);
				}
			}
	});
	it('the bar fill is still glass (below the 0.90 limit)', () => {
		const m = /--material-bar-fill: light-dark\(\s*color-mix\(in srgb, var\(--card\) (\d+)%/.exec(
			src('src/styles/theme/materials.css')
		)!;
		expect(Number(m[1])).toBeLessThan(90);
		expect(Number(m[1])).toBe(86);
	});
});

describe('b. the active nav item is a visible capsule', () => {
	it('the gate holds the chip apart from the sidebar (non-text floor 1.2)', () => {
		const p = (PAIRS as Array<{ label: string; min: number }>).find((x) =>
			x.label.startsWith('sidebar-accent on sidebar')
		)!;
		expect(p.label).toContain('active chip vs sidebar');
		expect(p.min).toBe(1.2);
		// and the existing text pair on the chip is still gated
		expect(PAIRS.map((x: { label: string }) => x.label)).toContain(
			'sidebar-accent-foreground on sidebar-accent (over sidebar)'
		);
	});
	it('the dark, brand and purple sidebars get a stronger chip (22%) than the light and sky ones (15%)', () => {
		const css = src('src/styles/theme/semantic.css');
		for (const c of ['dark', 'brand', 'purple'])
			expect(css).toMatch(
				new RegExp(
					`:root\\[data-sidebar-colors='${c}'\\] \\{\\s*--sidebar-accent: color-mix\\(in oklab, var\\(--sidebar-accent-foreground\\) 22%`
				)
			);
		expect(css).toContain(
			'--sidebar-accent: color-mix(in oklab, var(--sidebar-accent-foreground) 15%, var(--sidebar));'
		);
	});
	it('the sidebar item paints the chip when active, as a capsule, at every size', () => {
		const s = src('src/lib/layouts/NavItem.svelte');
		const cls = /isActive=\{active\}[\s\S]*?class="([^"]*)"/.exec(s)![1].split(/\s+/);
		expect(cls).toContain('data-active:bg-sidebar-accent');
		// hovering or pressing the active item keeps the chip (hover:bg-transparent would otherwise win)
		expect(cls).toContain('data-active:hover:bg-sidebar-accent');
		expect(cls).toContain('data-active:active:bg-sidebar-accent');
		expect(cls).not.toContain('data-active:bg-transparent');
		expect(cls).toContain('rounded-full');
		expect(cls).toContain('data-active:font-medium');
	});
	it('the horizontal nav active item is the same capsule', () => {
		const s = src('src/lib/layouts/HorizontalNav.svelte');
		expect(s).toContain('aria-[current]:bg-sidebar-accent');
		expect(s).toContain('rounded-full px-3');
	});
});

describe('c. the sidebar fill is 84% again; brand and sky have their own logo frame', () => {
	it('light sidebar fill is 84%', () => {
		expect(src('src/styles/theme/materials.css')).toMatch(
			/--material-sidebar-fill: light-dark\(\s*color-mix\(in srgb, var\(--sidebar\) 84%/
		);
	});
	it('the scoped frame step is declared for the default palette on brand and sky only', () => {
		const css = src('src/styles/theme/semantic.css');
		for (const sb of ['brand', 'sky'])
			expect(css).toMatch(
				new RegExp(
					`:root\\[data-colors='leadkart'\\]\\[data-sidebar-colors='${sb}'\\] \\{\\s*--sidebar-brand-frame: color-mix`
				)
			);
		expect(css.match(/:root\[data-colors='leadkart'\]\[data-sidebar-colors=/g)).toHaveLength(2);
	});
});
