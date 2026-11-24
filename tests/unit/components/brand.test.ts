/**
 * The brand pieces: the mark (the logo pack's geometry, inline, drawn in tokens), the wordmark (one
 * path in currentColor) and the large icon (unique gradient ids per instance, light and dark by CSS).
 * None of them is an <img>, none paints a hex or oklch literal.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import BrandMark from '#lib/components/ui/BrandMark.svelte';
import BrandWordmark from '#lib/components/ui/BrandWordmark.svelte';
import BrandIcon from '#lib/components/ui/BrandIcon.svelte';
import en from '../../../src/lib/i18n/locales/en.json';

const mounted: Array<ReturnType<typeof mount>> = [];
function render(Component: unknown, props: Record<string, unknown> = {}): HTMLElement {
	const target = document.body.appendChild(document.createElement('div'));
	mounted.push(mount(Component as never, { target, props }));
	flushSync();
	return target;
}
afterEach(() => {
	for (const m of mounted.splice(0)) unmount(m);
	document.body.innerHTML = '';
});

describe('BrandMark', () => {
	it('draws the logo pack geometry: the frame path, the capsule path and two wheels', () => {
		const svg = render(BrandMark).querySelector('svg')!;
		expect(svg.getAttribute('viewBox')).toBe('0 0 512 512');
		const group = svg.querySelector('g')!;
		expect(group.getAttribute('transform')).toBe('translate(-24 -14)');
		expect(group.getAttribute('stroke-linecap')).toBe('round');
		expect(group.getAttribute('stroke-linejoin')).toBe('round');
		const paths = [...svg.querySelectorAll('path')];
		expect(paths.map((p) => p.getAttribute('d'))).toEqual([
			'M150 108V316a32 32 0 0 0 32 32H410',
			'M272 248L384 136'
		]);
		expect(paths.map((p) => p.getAttribute('stroke-width'))).toEqual(['68', '84']);
		const wheels = [...svg.querySelectorAll('circle')];
		expect(
			wheels.map((c) => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')])
		).toEqual([
			['204', '432', '34'],
			['366', '432', '34']
		]);
	});

	it('is an image named LeadKart, or hidden from assistive technology when decorative', () => {
		const named = render(BrandMark).querySelector('svg')!;
		expect(named.getAttribute('role')).toBe('img');
		expect(named.getAttribute('aria-label')).toBe(en.common.brandName);
		expect(named.hasAttribute('aria-hidden')).toBe(false);

		const hidden = render(BrandMark, { decorative: true }).querySelector('svg')!;
		expect(hidden.getAttribute('aria-hidden')).toBe('true');
		expect(hidden.hasAttribute('role')).toBe(false);
		expect(hidden.hasAttribute('aria-label')).toBe(false);
	});

	it('paints the frame and wheels from --brand-frame and the capsule from --brand-capsule (sidebar: its own pair)', () => {
		const surface = render(BrandMark).querySelector('[data-brand-mark]')!;
		expect(surface.className).toContain('[--mark-frame:var(--brand-frame)]');
		expect(surface.className).toContain('[--mark-capsule:var(--brand-capsule)]');
		const svg = surface.querySelector('svg')!;
		const [frame, capsule] = [...svg.querySelectorAll('path')];
		expect(frame!.getAttribute('class')).toContain('stroke-(--mark-frame)');
		expect(capsule!.getAttribute('class')).toContain('stroke-(--mark-capsule)');
		for (const wheel of svg.querySelectorAll('circle'))
			expect(wheel.getAttribute('class')).toContain('fill-(--mark-frame)');

		const sidebar = render(BrandMark, { tone: 'sidebar' }).querySelector('[data-brand-mark]')!;
		expect(sidebar.className).toContain('[--mark-frame:var(--sidebar-brand-frame)]');
		expect(sidebar.className).toContain('[--mark-capsule:var(--sidebar-brand-capsule)]');
	});

	it('mono paints everything in currentColor', () => {
		const svg = render(BrandMark, { mono: true }).querySelector('svg')!;
		for (const el of svg.querySelectorAll('path'))
			expect(el.getAttribute('class')).toContain('stroke-current');
		for (const el of svg.querySelectorAll('circle'))
			expect(el.getAttribute('class')).toContain('fill-current');
		expect(svg.outerHTML).not.toContain('--mark-frame');
	});

	it('has no raster and no colour literal', () => {
		const html = render(BrandMark, { wordmark: true }).innerHTML;
		expect(html).not.toContain('<img');
		expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
		expect(html).not.toMatch(/oklch\(|rgb\(/);
		const source = readFileSync('src/lib/components/ui/BrandMark.svelte', 'utf8');
		expect(source).not.toMatch(/#[0-9a-fA-F]{6}\b/);
	});

	it('with the wordmark the pair is one unit named by the wordmark, the mark itself hidden', () => {
		const root = render(BrandMark, { wordmark: true });
		expect(root.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		const named = root.querySelectorAll('[role="img"]');
		expect(named).toHaveLength(1);
		expect(named[0]!.getAttribute('aria-label')).toBe(en.common.brandName);
		expect(root.querySelectorAll('[data-brand-wordmark]')).toHaveLength(1);
	});
});

describe('BrandWordmark', () => {
	it('is one path filled with currentColor, no text element, named LeadKart', () => {
		const svg = render(BrandWordmark).querySelector('svg')!;
		expect(svg.querySelectorAll('path')).toHaveLength(1);
		expect(svg.querySelectorAll('text, image, linearGradient, radialGradient')).toHaveLength(0);
		expect(svg.getAttribute('fill')).toBe('currentColor');
		expect(svg.getAttribute('viewBox')).toBe('0 0 395.55 73.50');
		expect(svg.getAttribute('role')).toBe('img');
		expect(svg.getAttribute('aria-label')).toBe(en.common.brandName);
	});

	it('carries the logo pack outline unchanged (svg/wordmark-ink.svg, pinned by hash)', () => {
		const d = render(BrandWordmark).querySelector('path')!.getAttribute('d')!;
		expect(d).toHaveLength(4859);
		expect(createHash('sha256').update(d).digest('hex')).toBe(
			'e052188aea8ec03d8c5b298e7ff82bea60ab2a339a78462360f086c7cf1ada1f'
		);
	});

	it('is hidden from assistive technology when decorative', () => {
		const svg = render(BrandWordmark, { decorative: true }).querySelector('svg')!;
		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.hasAttribute('role')).toBe(false);
		expect(svg.hasAttribute('aria-label')).toBe(false);
	});
});

describe('BrandIcon', () => {
	it('two instances on one page have distinct gradient and filter ids, and every reference resolves in its own instance', () => {
		const a = render(BrandIcon);
		const b = render(BrandIcon);
		const ids = (root: HTMLElement) => [...root.querySelectorAll('[id]')].map((e) => e.id);
		const idsA = ids(a);
		const idsB = ids(b);
		expect(idsA.length).toBeGreaterThan(10);
		expect(idsA.filter((id) => idsB.includes(id))).toEqual([]);
		expect(new Set(idsA).size).toBe(idsA.length);
		for (const root of [a, b]) {
			const own = new Set(ids(root));
			const refs = [...root.innerHTML.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!);
			expect(refs.length).toBeGreaterThan(10);
			for (const ref of refs) expect(own.has(ref)).toBe(true);
		}
	});

	it('draws a light and a dark icon and picks one by the dark variant (CSS only)', () => {
		const icon = render(BrandIcon);
		const [light, dark] = [...icon.querySelectorAll('svg')];
		expect(light!.getAttribute('class')).toContain('dark:hidden');
		expect(dark!.getAttribute('class')).toContain('hidden');
		expect(dark!.getAttribute('class')).toContain('dark:block');
		expect(icon.querySelector('[data-brand-icon]')!.getAttribute('aria-hidden')).toBe('true');
	});

	it('has no raster, no colour literal in its style, and an opaque plate for reduced transparency', () => {
		const source = readFileSync('src/lib/components/ui/BrandIcon.svelte', 'utf8');
		const style = source.slice(source.indexOf('<style>'));
		expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(/);
		expect(style).toContain('var(--brand-plate-solid)');
		expect(style).toContain('var(--brand-plate-glass)');
		expect(render(BrandIcon).innerHTML).not.toContain('<img');
	});
});
