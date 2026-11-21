/**
 * The customizer: a named sheet whose option groups are named radio groups. Every control writes ONE
 * preference (the lk_ui store), which re-skins the page through the <html> attributes at once; Reset
 * restores the defaults; nothing is announced as an alert, and no tile carries an inline style.
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_PREFERENCES,
	PREFERENCE_ATTRIBUTES,
	PREFERENCE_KEYS,
	createPreferences,
	type PreferencesStore,
	type Preferences
} from '$features/preferences';
import { createSidebarSizing } from '$layouts/sidebar-sizing.ts';
import CustomizerHost from '../stubs/CustomizerHost.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let prefs: PreferencesStore;
const writes: Array<Preferences> = [];

async function render(initial: Partial<Preferences> = {}) {
	prefs = createPreferences({ ...DEFAULT_PREFERENCES, ...initial }, {
		read: () => null,
		write: (p: Preferences) => void writes.push(p)
	} as never);
	component = mount(CustomizerHost, { target, props: { prefs } });
	flushSync();
	await tick();
	await tick();
}

beforeEach(() => {
	target = document.body.appendChild(document.createElement('div'));
	writes.length = 0;
	for (const key of PREFERENCE_KEYS)
		document.documentElement.setAttribute(PREFERENCE_ATTRIBUTES[key], DEFAULT_PREFERENCES[key]);
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
	for (const key of PREFERENCE_KEYS)
		document.documentElement.removeAttribute(PREFERENCE_ATTRIBUTES[key]);
});

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const groups = () => [...dialog().querySelectorAll<HTMLElement>('[role="radiogroup"]')];
const nameOf = (el: HTMLElement) =>
	el
		.getAttribute('aria-labelledby')
		?.split(' ')
		.map((id) => document.getElementById(id)?.textContent?.trim())
		.join(' ') ?? el.getAttribute('aria-label');
const group = (name: string) => groups().find((g) => nameOf(g) === name)!;
const radio = (groupName: string, label: string) =>
	[...group(groupName).querySelectorAll<HTMLElement>('[role="radio"]')].find(
		(r) => r.textContent?.trim() === label
	)!;
const click = async (el: HTMLElement) => {
	el.click();
	flushSync();
	await tick();
};

describe('the customizer sheet', () => {
	it('is a dialog named "Customize" with a description, and offers a Close', async () => {
		await render();
		const d = dialog();
		expect(nameOf(d)).toBe('Customize');
		expect(d.querySelector('[data-slot="sheet-description"]')?.textContent).toContain(
			'remembered on this device'
		);
		expect(d.querySelector('[data-slot="sheet-close"]')).not.toBeNull();
	});

	it('every visible option group is a named radiogroup, in the Domiex order', async () => {
		await render();
		expect(groups().map(nameOf)).toEqual([
			'Layout',
			'Navigation style',
			'Content width',
			'Sidebar size',
			'Mode',
			'Transparency',
			'Sidebar colour',
			'Primary colour'
		]);
		for (const g of groups()) {
			const radios = g.querySelectorAll('[role="radio"]');
			expect(radios.length).toBeGreaterThan(1);
			// exactly one is checked
			expect([...radios].filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
		}
	});

	it('names every radio by its visible label', async () => {
		await render();
		expect(
			[...group('Primary colour').querySelectorAll('[role="radio"]')].map((r) =>
				r.textContent?.trim()
			)
		).toEqual(['LeadKart', 'Green', 'Violet', 'Orange', 'Teal', 'Fuchsia', 'Lime', 'Amber']);
	});
});

describe('every control writes one preference and the page re-skins at once', () => {
	it('choosing Dark sets store.mode and data-mode="dark" on <html>', async () => {
		await render();
		await click(radio('Mode', 'Dark'));
		expect(prefs.mode).toBe('dark');
		expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
		expect(radio('Mode', 'Dark').getAttribute('aria-checked')).toBe('true');
		expect(radio('Mode', 'Light').getAttribute('aria-checked')).toBe('false');
		expect(writes.at(-1)?.mode).toBe('dark');
	});

	it.each([
		['Layout', 'Horizontal', 'layout', 'horizontal', 'data-layout'],
		['Navigation style', 'Pattern', 'navType', 'pattern', 'data-nav-type'],
		['Content width', 'Fluid', 'contentWidth', 'fluid', 'data-content-width'],
		['Sidebar size', 'Small (icons)', 'sidebar', 'small', 'data-sidebar'],
		['Mode', 'Black and white', 'mode', 'black-white', 'data-mode'],
		['Sidebar colour', 'Brand', 'sidebarColors', 'brand', 'data-sidebar-colors'],
		['Primary colour', 'Teal', 'colors', 'teal', 'data-colors']
	] as const)('%s: %s -> %s=%s on %s', async (g, label, key, value, attr) => {
		await render();
		await click(radio(g, label));
		expect(prefs[key]).toBe(value);
		expect(document.documentElement.getAttribute(attr)).toBe(value);
		// one preference changed, none of the others
		for (const other of PREFERENCE_KEYS.filter((k) => k !== key))
			expect(prefs[other]).toBe(DEFAULT_PREFERENCES[other]);
	});

	it('dark mode brings the dark-surface group in, and light takes it out again', async () => {
		await render();
		expect(groups().map(nameOf)).not.toContain('Dark surfaces');
		await click(radio('Mode', 'Dark'));
		expect(groups().map(nameOf)).toContain('Dark surfaces');
		await click(radio('Dark surfaces', 'Zinc'));
		expect(document.documentElement.getAttribute('data-dark-palette')).toBe('zinc');
		await click(radio('Mode', 'Light'));
		expect(groups().map(nameOf)).not.toContain('Dark surfaces');
	});

	it('the horizontal layout hides navigation style, sidebar size and sidebar colour', async () => {
		await render();
		await click(radio('Layout', 'Horizontal'));
		const names = groups().map(nameOf);
		for (const hidden of ['Navigation style', 'Sidebar size', 'Sidebar colour'])
			expect(names).not.toContain(hidden);
		expect(names).toContain('Primary colour');
	});

	it('a Medium sidebar chosen here is what the toggle returns to after collapse and expand', async () => {
		await render();
		const sizing = createSidebarSizing(prefs);
		await click(radio('Sidebar size', 'Medium'));
		expect(prefs.sidebar).toBe('medium');
		sizing.setOpen(false);
		expect(prefs.sidebar).toBe('small');
		sizing.setOpen(true);
		expect(prefs.sidebar).toBe('medium');
	});

	it('the sidebar group says where Ctrl/Cmd+B does not apply', async () => {
		await render();
		expect(dialog().textContent).toContain('does not apply in the horizontal layout');
	});
});

describe('Reset to defaults', () => {
	it('restores every attribute and every control', async () => {
		await render({
			layout: 'semibox',
			navType: 'floating',
			contentWidth: 'fluid',
			sidebar: 'medium',
			mode: 'dark',
			colors: 'teal',
			sidebarColors: 'sky',
			darkPalette: 'zinc'
		});
		const reset = [...dialog().querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Reset to defaults'
		)!;
		expect(reset).toBeTruthy();
		await click(reset);
		for (const key of PREFERENCE_KEYS) {
			expect(prefs[key]).toBe(DEFAULT_PREFERENCES[key]);
			expect(document.documentElement.getAttribute(PREFERENCE_ATTRIBUTES[key])).toBe(
				DEFAULT_PREFERENCES[key]
			);
		}
		expect(radio('Layout', 'Vertical').getAttribute('aria-checked')).toBe('true');
		expect(radio('Primary colour', 'LeadKart').getAttribute('aria-checked')).toBe('true');
	});
});

describe('accessibility and tokens', () => {
	it('announces nothing: no alert, status or live region inside the sheet', async () => {
		await render();
		await click(radio('Mode', 'Dark'));
		expect(dialog().querySelector('[role="alert"], [role="status"], [aria-live]')).toBeNull();
	});

	it('tiles carry no inline style (colours come from data-swatch / data-preview and CSS tokens)', async () => {
		await render();
		expect(dialog().querySelectorAll('[style]').length).toBe(0);
		const swatches = dialog().querySelectorAll('[data-swatch]');
		expect(swatches.length).toBeGreaterThanOrEqual(13);
		expect(dialog().querySelector('[data-swatch="colors-teal"]')).not.toBeNull();
		expect(dialog().querySelector('[data-preview="layout-semibox"]')).not.toBeNull();
	});

	describe('below lg (matchMedia stub)', () => {
		const original = window.matchMedia;
		const stub = (narrow: boolean) =>
			(window.matchMedia = ((query: string) => ({
				matches: narrow && query.includes('max-width'),
				media: query,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				onchange: null,
				dispatchEvent: () => false
			})) as never);
		afterEach(() => (window.matchMedia = original));
		const layoutRadios = () => [...group('Layout').querySelectorAll<HTMLElement>('[role="radio"]')];
		const isDisabled = (r: HTMLElement) =>
			r.hasAttribute('data-disabled') || (r as HTMLButtonElement).disabled;
		const key = (el: HTMLElement, k: string) => {
			el.focus();
			el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
			flushSync();
		};

		it('the layouts that need room are disabled (not hidden: no hidden roving stop) with a hint', async () => {
			stub(true);
			await render();
			for (const name of ['Modern', 'Semibox']) {
				expect(isDisabled(radio('Layout', name))).toBe(true);
				expect(radio('Layout', name).className).not.toMatch(/max-lg:[^ ]*hidden/);
			}
			for (const name of ['Vertical', 'Horizontal', 'Boxed'])
				expect(isDisabled(radio('Layout', name))).toBe(false);
			expect(dialog().textContent).toContain('larger screens');
		});

		it('wide: nothing is disabled and no hint is shown', async () => {
			stub(false);
			await render();
			expect(layoutRadios().filter(isDisabled)).toHaveLength(0);
			expect(dialog().textContent).not.toContain('larger screens');
		});

		it('arrow keys cycle only the available tiles, and the group keeps exactly one tab stop', async () => {
			stub(true);
			await render();
			expect(layoutRadios().filter((r) => r.tabIndex === 0)).toHaveLength(1);
			key(radio('Layout', 'Horizontal'), 'ArrowRight');
			expect(document.activeElement).toBe(radio('Layout', 'Boxed'));
			key(radio('Layout', 'Boxed'), 'ArrowLeft');
			expect(document.activeElement).toBe(radio('Layout', 'Horizontal'));
			const stops = layoutRadios().filter((r) => r.tabIndex === 0);
			expect(stops).toHaveLength(1);
			expect(isDisabled(stops[0]!)).toBe(false);
		});

		it('a saved semibox layout shows the tile that is rendered at this width as checked and focusable; the preference is untouched', async () => {
			stub(true);
			await render({ layout: 'semibox' });
			const checked = layoutRadios().filter((r) => r.getAttribute('aria-checked') === 'true');
			expect(checked).toEqual([radio('Layout', 'Vertical')]);
			expect(checked[0]!.tabIndex).toBe(0);
			expect(layoutRadios().filter((r) => r.tabIndex === 0)).toHaveLength(1);
			expect(prefs.layout).toBe('semibox');
			expect(writes).toHaveLength(0);
		});

		it('a saved semibox layout on a wide screen is the checked one', async () => {
			stub(false);
			await render({ layout: 'semibox' });
			expect(radio('Layout', 'Semibox').getAttribute('aria-checked')).toBe('true');
		});
	});

	it('arrow keys move through a group (roving focus: one tab stop per group)', async () => {
		await render();
		const radios = [...group('Primary colour').querySelectorAll<HTMLElement>('[role="radio"]')];
		expect(radios.filter((r) => r.tabIndex === 0)).toHaveLength(1);
		expect(radios.filter((r) => r.tabIndex === -1)).toHaveLength(radios.length - 1);
	});
});
