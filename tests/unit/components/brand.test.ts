/**
 * The brand pieces: the mark (LK monogram 6 "Two Cuts", inline, two token fills), the wordmark (one
 * path in currentColor), the app pebble and the large icon (the mark on the brand pebble).
 * None of them is an <img>, none paints a hex or oklch literal.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AppPebble from '#lib/components/ui/AppPebble.svelte';
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

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('BrandMark', () => {
	// the monogram 6 path set (logo study, glyphs.mjs concept 6), pinned by hash: l + '|' + k
	const FULL = '72820006e77a7adaf153f708873da466df6e2dd36b9872cf0659dd9917eab28e';
	const SMALL = 'b100313ba0d13c2f8fa5bce461ef3725e8ecd67116fd8babe3345851645763f7';
	const drawing = (root: HTMLElement) => {
		const svg = root.querySelector('svg')!;
		const [l, k] = [...svg.querySelectorAll('path')];
		return { svg, l: l!, k: k! };
	};

	it('draws the monogram 6 path set: the L then the K, two paths and nothing else', () => {
		const { svg, l, k } = drawing(render(BrandMark, { size: 'lg' }));
		expect(svg.querySelectorAll('path')).toHaveLength(2);
		expect(svg.querySelectorAll('circle, rect, line, g, image, linearGradient')).toHaveLength(0);
		expect(svg.getAttribute('viewBox')).toBe('2 2 60 60');
		expect(sha(`${l.getAttribute('d')}|${k.getAttribute('d')}`)).toBe(FULL);
	});

	it('switches to the small drawing at 32 px and under, the full one above', () => {
		for (const size of ['sm', 'md']) {
			const { svg, l, k } = drawing(render(BrandMark, { size }));
			expect(svg.getAttribute('viewBox'), size).toBe('3 3 10 10');
			expect(sha(`${l.getAttribute('d')}|${k.getAttribute('d')}`), size).toBe(SMALL);
		}
		const lg = drawing(render(BrandMark, { size: 'lg' }));
		expect(lg.svg.getAttribute('viewBox')).toBe('2 2 60 60');
		// an explicit drawing wins over the size (the pebble sets it)
		const forced = drawing(render(BrandMark, { size: 'sm', drawing: 'full' }));
		expect(forced.svg.getAttribute('viewBox')).toBe('2 2 60 60');
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

	it('fills the L from --brand-frame (= --primary) and the K from --brand-capsule (= --brand-2): the gated, re-declarable logo tokens', () => {
		const surface = render(BrandMark).querySelector('[data-brand-mark]')!;
		expect(surface.className).toContain('[--m1:var(--brand-frame)]');
		expect(surface.className).toContain('[--m2:var(--brand-capsule)]');
		const semantic = readFileSync('src/styles/theme/semantic.css', 'utf8');
		expect(semantic).toContain('--brand-frame-light: var(--primary-fill);');
		expect(semantic).toContain('--brand-capsule-light: var(--brand-2-500);');
		const pebble = render(BrandMark, { tone: 'pebble' }).querySelector('[data-brand-mark]')!;
		expect(pebble.className).toContain('[--m1:var(--app-glyph)]');
		expect(pebble.className).toContain('[--m2:var(--brand-pebble-capsule)]');
		const { l, k } = drawing(surface as HTMLElement);
		expect(l.getAttribute('class')).toContain('fill-(--m1)');
		expect(k.getAttribute('class')).toContain('fill-(--m2)');
		expect(surface.innerHTML).not.toContain('stroke');

		const sidebar = render(BrandMark, { tone: 'sidebar' }).querySelector('[data-brand-mark]')!;
		expect(sidebar.className).toContain('[--m1:var(--sidebar-brand-frame)]');
		expect(sidebar.className).toContain('[--m2:var(--sidebar-brand-capsule)]');
	});

	it('mono paints both pieces in currentColor', () => {
		const { svg, l, k } = drawing(render(BrandMark, { mono: true }));
		expect(l.getAttribute('class')).toContain('fill-current');
		expect(k.getAttribute('class')).toContain('fill-current');
		expect(svg.outerHTML).not.toContain('--m1');
	});

	it('has no raster, no colour literal and no trace of the old cart-L mark', () => {
		const html = render(BrandMark, { wordmark: true }).innerHTML;
		expect(html).not.toContain('<img');
		expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
		expect(html).not.toMatch(/oklch\(|rgb\(/);
		expect(html).not.toContain('<circle');
		const source = readFileSync('src/lib/components/ui/BrandMark.svelte', 'utf8');
		expect(source).not.toMatch(/#[0-9a-fA-F]{6}\b/);
		// it paints the gated logo tokens, never a raw palette step
		expect(source).not.toMatch(/var\(--(primary|brand-2)(-\d+)?\)/);
		expect(source).not.toContain('--mark-frame');
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

describe('AppPebble', () => {
	it('app="orders" is in the orders scope (--app-accent) and hidden from assistive technology without a label', () => {
		const pebble = render(AppPebble, { app: 'orders', size: 'md' }).querySelector(
			'[data-app-pebble]'
		)!;
		expect(pebble.classList.contains('app-orders')).toBe(true);
		expect(pebble.className).toContain('material-pebble');
		expect(pebble.getAttribute('aria-hidden')).toBe('true');
		expect(pebble.hasAttribute('role')).toBe(false);
		expect(pebble.getAttribute('data-app')).toBe('orders');
	});

	it('with a label it is an image with that name', () => {
		const pebble = render(AppPebble, { app: 'stock', size: 'sm', label: 'Stock' }).querySelector(
			'[data-app-pebble]'
		)!;
		expect(pebble.getAttribute('role')).toBe('img');
		expect(pebble.getAttribute('aria-label')).toBe('Stock');
		expect(pebble.hasAttribute('aria-hidden')).toBe(false);
	});

	it('without an app it is the brand colour (the home scope, even inside another app) with the mark', () => {
		const pebble = render(AppPebble, { size: 'lg' }).querySelector('[data-app-pebble]')!;
		expect(pebble.classList.contains('app-home')).toBe(true);
		expect(pebble.querySelector('[data-brand-mark]')).not.toBeNull();
		expect(pebble.hasAttribute('data-app')).toBe(false);
	});

	it('draws the glyph icon when one is given, not the mark', () => {
		const Glyph = (anchor: Comment) => {
			const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			el.setAttribute('data-glyph', '');
			anchor.before(el);
		};
		const pebble = render(AppPebble, { app: 'leads', size: 'md', icon: Glyph }).querySelector(
			'[data-app-pebble]'
		)!;
		expect(pebble.querySelector('[data-glyph]')).not.toBeNull();
		expect(pebble.querySelector('[data-brand-mark]')).toBeNull();
	});

	it('has one size per step and no colour literal', () => {
		for (const size of ['xs', 'sm', 'md', 'lg']) {
			const pebble = render(AppPebble, { size }).querySelector('[data-app-pebble]')!;
			expect(pebble.getAttribute('data-size')).toBe(size);
		}
		const source = readFileSync('src/lib/components/ui/AppPebble.svelte', 'utf8');
		expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(/);
	});
});

describe('BrandIcon', () => {
	it('composes the one pebble: the brand pebble with the mark, decorative', () => {
		const root = render(BrandIcon);
		const icon = root.querySelector('[data-brand-icon]')!;
		expect(icon.getAttribute('aria-hidden')).toBe('true');
		expect(icon.matches('[data-app-pebble]')).toBe(true);
		expect(icon.classList.contains('app-home')).toBe(true);
		const mark = icon.querySelector('[data-brand-mark]')!;
		expect(mark).not.toBeNull();
		// the large icon shows the full drawing
		expect(mark.querySelector('svg')!.getAttribute('viewBox')).toBe('2 2 60 60');
	});

	it('has no raster, no gradient of its own and no colour literal', () => {
		const source = readFileSync('src/lib/components/ui/BrandIcon.svelte', 'utf8');
		expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(/);
		expect(source).not.toContain('linearGradient');
		expect(source).toContain('AppPebble');
		expect(render(BrandIcon).innerHTML).not.toContain('<img');
	});
});
