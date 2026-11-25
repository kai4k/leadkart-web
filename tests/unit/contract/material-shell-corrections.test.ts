/**
 * Corrections after looking at the glass shell (controller review of fix round D):
 *  a. the light bar is never duller than the page beneath it;
 *  b. the active nav item: a 3px indicator bar (shape cue) and a translucent chip, both gated where they are painted;
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
	it('over the page colour the bar composite is at least as light as the page, on every palette (light)', () => {
		const all = rules();
		const layer = {
			...(MATERIAL_LAYERS as unknown as Array<{ layer: string }>).find(
				(l) => l.layer === 'topbar'
			)!,
			backdrops: ['background']
		};
		for (const palette of AXES.palette)
			for (const mode of ['light'] as const) {
				const props = propertiesFor(all, {
					palette,
					mode,
					sidebarColors: 'light',
					transparency: 'glass'
				});
				const page = lum(resolveColor('background', props, mode));
				for (const { color } of layerCorners(props, mode, layer as never)) {
					const bar = lum(resolveColor('material-bar-fill', props, mode, color));
					expect(bar, `${palette}/${mode}`).toBeGreaterThanOrEqual(page - 1e-9);
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

describe('b. the active nav item: a shape cue and a tint gated where they are painted', () => {
	it('there is no token-against-token pair for the chip (it is translucent: only the glass composites mean anything)', () => {
		expect(
			(PAIRS as Array<{ label: string }>).some((x) =>
				x.label.startsWith('sidebar-accent on sidebar')
			)
		).toBe(false);
		// the text pair on the chip, over the sidebar, and the indicator pairs are gated
		const labels = PAIRS.map((x: { label: string }) => x.label);
		expect(labels).toContain('sidebar-accent-foreground on sidebar-accent (over sidebar)');
		expect(labels).toContain('sidebar-indicator on sidebar [active item indicator bar]');
		expect(labels).toContain(
			'sidebar-indicator on sidebar-accent (over sidebar) [indicator on the chip]'
		);
	});
	it('every sidebar layer gates the chip as a mark on its glass composite, the indicator as a mark, and text on the chip', () => {
		for (const name of ['hnav', 'sidebar-desktop', 'sidebar-mobile']) {
			const layer = MATERIAL_LAYERS.find((l: { layer: string }) => l.layer === name)!;
			const marks = layer.marks.map((m: string | { token: string }) =>
				typeof m === 'string' ? m : m.token
			);
			expect(marks, name).toContain('sidebar-accent');
			expect(marks, name).toContain('sidebar-indicator');
			const on = layer.onControl!.find((o: { control: string }) => o.control === 'sidebar-accent')!;
			expect(on.text, name).toEqual(
				expect.arrayContaining([
					'sidebar-accent-foreground',
					'sidebar-foreground',
					'sidebar-indicator'
				])
			);
		}
	});
	it('the chip is a translucent tint of the accent text in every sidebar colour; the indicator is the accent text', () => {
		const css = src('src/styles/theme/semantic.css');
		expect(css).not.toMatch(/--sidebar-accent: color-mix\(in oklab/); // no opaque chip mixed into --sidebar
		for (const c of ['dark', 'brand', 'purple', 'sky'])
			expect(css).toMatch(
				new RegExp(
					`:root\\[data-sidebar-colors='${c}'\\] \\{[^}]*--sidebar-accent: color-mix\\(in srgb, var\\(--sidebar-accent-foreground\\) \\d+%, transparent\\)`
				)
			);
		expect(css).toContain('--sidebar-indicator: var(--sidebar-accent-foreground);');
		// inactive icons are the muted sidebar text; no light-sidebar accent-icon override remains
		expect(css).toContain('--sidebar-icon: var(--sidebar-muted-foreground);');
		expect(css).not.toMatch(/data-sidebar-colors='light'\] \{\s*--sidebar-icon/);
	});
	it('the active item has the 3px inline-start bar (logical, 16px tall, collapsed too) and accent icon', () => {
		const cls = /isActive=\{active\}[\s\S]*?class="([^"]*)"/.exec(
			src('src/lib/layouts/NavItem.svelte')
		)![1];
		for (const c of [
			'data-active:before:absolute',
			'data-active:before:start-1.5',
			'data-active:before:h-4',
			'data-active:before:w-0.75',
			'data-active:before:rounded-full',
			'data-active:before:bg-sidebar-indicator'
		])
			expect(cls.split(/\s+/), c).toContain(c);
		// never a physical edge, and nothing removes it in the collapsed rail
		expect(cls).not.toMatch(/before:(left|right)-/);
		expect(cls).not.toMatch(/collapsible=icon\]:[^\s]*before/);
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
	it('the brand and sky sidebars declare their own light frame step and K, for every palette', () => {
		const css = src('src/styles/theme/semantic.css');
		const block = (sb: string) =>
			new RegExp(`:root\\[data-sidebar-colors='${sb}'\\] \\{([^}]*)\\}`).exec(css)![1];
		for (const sb of ['brand', 'sky']) {
			expect(block(sb), sb).toContain('--sidebar-brand-frame: var(--primary-100);');
			expect(block(sb), sb).toContain('--sidebar-brand-capsule: var(--brand-2-500);');
		}
		for (const sb of ['dark', 'purple'])
			expect(block(sb), sb).toContain('--sidebar-brand-frame: var(--brand-frame-dark);');
	});
});
