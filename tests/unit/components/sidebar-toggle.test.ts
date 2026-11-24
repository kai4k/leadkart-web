/**
 * The sidebar's toggle: it returns to the size the user had (a `medium` user who collapses and
 * expands gets `medium` back), and Ctrl/Cmd+B toggles only where a sidebar is there to toggle and
 * the keystroke is not meant for something else (a field, an open dialog or sheet, the horizontal
 * layout).
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../helpers/match-media.ts';
import { createSidebarSizing } from '#lib/layouts/sidebar-sizing.ts';
import {
	createPreferences,
	noopStorage,
	type Preferences,
	type PreferencesStore
} from '#lib/features/preferences/index.ts';
import ShortcutHost from '../stubs/ShortcutHost.svelte';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/dashboard') } }));
vi.mock('#lib/features/auth/index.ts', () => ({
	session: { capabilities: null, inTenantContext: false }
}));

const store = (p: Partial<Preferences>): PreferencesStore =>
	createPreferences({ ...p } as Preferences, noopStorage, () => null);

describe('createSidebarSizing', () => {
	it('collapses to small and comes back to the size it had', () => {
		const prefs = store({ sidebar: 'medium' });
		const sizing = createSidebarSizing(prefs);
		expect(sizing.open).toBe(true);
		sizing.setOpen(false);
		expect(prefs.sidebar).toBe('small');
		expect(sizing.open).toBe(false);
		sizing.setOpen(true);
		expect(prefs.sidebar).toBe('medium');
	});

	it('large goes small and back to large', () => {
		const prefs = store({ sidebar: 'large' });
		const sizing = createSidebarSizing(prefs);
		sizing.setOpen(false);
		sizing.setOpen(true);
		expect(prefs.sidebar).toBe('large');
	});

	it('a user who starts collapsed expands to large', () => {
		const prefs = store({ sidebar: 'small' });
		const sizing = createSidebarSizing(prefs);
		expect(sizing.open).toBe(false);
		sizing.setOpen(true);
		expect(prefs.sidebar).toBe('large');
	});

	it('a size chosen elsewhere (the customizer) is what comes back', () => {
		const prefs = store({ sidebar: 'large' });
		const sizing = createSidebarSizing(prefs);
		sizing.setOpen(false);
		prefs.set({ sidebar: 'medium' });
		sizing.setOpen(false);
		sizing.setOpen(true);
		expect(prefs.sidebar).toBe('medium');
	});
});

describe('Ctrl/Cmd+B', () => {
	let target: HTMLElement;
	let component: ReturnType<typeof mount> | undefined;
	let prefs: PreferencesStore;

	async function render(p: Partial<Preferences>, enabled = true) {
		prefs = store(p);
		component = mount(ShortcutHost, { target, props: { prefs, enabled } });
		flushSync();
		await tick();
	}
	function press(on: EventTarget = document.body, init: KeyboardEventInit = {}) {
		const e = new KeyboardEvent('keydown', {
			key: 'b',
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
			...init
		});
		on.dispatchEvent(e);
		flushSync();
		return e;
	}

	beforeEach(() => {
		installMatchMedia(1280);
		target = document.body.appendChild(document.createElement('div'));
	});
	afterEach(() => {
		if (component) unmount(component);
		component = undefined;
		target.remove();
		document.body.innerHTML = '';
	});

	it('toggles the sidebar from the page', async () => {
		await render({ sidebar: 'large' });
		const e = press();
		expect(prefs.sidebar).toBe('small');
		expect(e.defaultPrevented).toBe(true);
		press(document.body, { ctrlKey: false, metaKey: true });
		expect(prefs.sidebar).toBe('large');
	});

	it.each([
		['an input', () => document.createElement('input')],
		['a textarea', () => document.createElement('textarea')],
		['a select', () => document.createElement('select')],
		[
			'a contenteditable',
			() => {
				const d = document.createElement('div');
				d.setAttribute('contenteditable', 'true');
				return d;
			}
		]
	])('is left alone when typed into %s', async (_n, make) => {
		await render({ sidebar: 'large' });
		const field = target.appendChild(make());
		const e = press(field);
		expect(prefs.sidebar).toBe('large');
		expect(e.defaultPrevented).toBe(false);
	});

	it('is left alone while a dialog or sheet is open', async () => {
		await render({ sidebar: 'large' });
		const dialog = document.body.appendChild(document.createElement('div'));
		dialog.setAttribute('role', 'dialog');
		press();
		expect(prefs.sidebar).toBe('large');
		dialog.remove();
		press();
		expect(prefs.sidebar).toBe('small');
	});

	it('is ignored where there is no sidebar to toggle (the horizontal layout)', async () => {
		await render({ sidebar: 'large', layout: 'horizontal' }, false);
		const e = press();
		expect(prefs.sidebar).toBe('large');
		expect(e.defaultPrevented).toBe(false);
	});
});
