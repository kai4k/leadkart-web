/**
 * The auth frame: one main landmark the skip link reaches, a labelled brand aside, a decorative
 * backdrop hidden from assistive technology, and no heading of its own (the page's form owns the h1).
 * The shell has no legacy token and stops its motion for `prefers-reduced-motion`.
 */
import { readFileSync } from 'node:fs';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installMatchMedia } from '../helpers/match-media.ts';
import AuthShell from '$layouts/AuthShell.svelte';
import en from '../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
	installMatchMedia(1280);
	target = document.body.appendChild(document.createElement('div'));
	component = mount(AuthShell, {
		target,
		props: {
			children: createRawSnippet(() => ({
				render: () => '<form aria-label="Sign in"><button>Go</button></form>'
			}))
		}
	});
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

describe('AuthShell landmarks', () => {
	it('has exactly one main#main-content that can take focus from the skip link', () => {
		const mains = document.querySelectorAll('main');
		expect(mains).toHaveLength(1);
		expect(mains[0]!.id).toBe('main-content');
		expect(mains[0]!.getAttribute('tabindex')).toBe('-1');
		expect(mains[0]!.querySelector('form')).not.toBeNull();
	});

	it('has one labelled brand aside, outside main', () => {
		const asides = document.querySelectorAll('aside');
		expect(asides).toHaveLength(1);
		expect(asides[0]!.getAttribute('aria-label')).toBe(en.common.brandName);
		expect(asides[0]!.closest('main')).toBeNull();
		expect(asides[0]!.textContent).toContain(en.auth.brand.headline);
	});

	it('has a decorative backdrop hidden from assistive technology', () => {
		const backdrop = document.querySelector('[data-auth-backdrop]');
		expect(backdrop).not.toBeNull();
		expect(backdrop!.getAttribute('aria-hidden')).toBe('true');
		expect(backdrop!.closest('main')).toBeNull();
	});

	it('renders no heading: the page form owns the h1', () => {
		expect(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(0);
	});

	it('the mobile brand row is the one header, and the footer line is plain text', () => {
		expect(document.querySelectorAll('header')).toHaveLength(1);
		expect(document.body.textContent).toContain(`© ${new Date().getFullYear()} LeadKart`);
	});
});

describe('AuthShell styles', () => {
	const parts = ['AuthShell', 'AuthBrandPanel', 'AuthBackdrop'].map((n) => [
		n,
		readFileSync(`src/lib/layouts/${n}.svelte`, 'utf8')
	]);

	it.each(parts)('%s uses no legacy colour token', (_name, src) => {
		expect(src).not.toMatch(/--color-|--lk-|text-fg|bg-bg|glass/);
	});

	it('the backdrop removes its pointer motion under prefers-reduced-motion and skips the pointer script', () => {
		const backdrop = readFileSync('src/lib/layouts/AuthBackdrop.svelte', 'utf8');
		expect(backdrop).toContain('prefers-reduced-motion: reduce');
		expect(backdrop).toMatch(/transition:\s*none/);
		expect(backdrop).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
	});

	it.each(parts)('%s stays inside the line budget', (_name, src) => {
		expect(src.split('\n').length).toBeLessThanOrEqual(300);
	});
});
