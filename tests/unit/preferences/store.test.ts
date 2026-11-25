import { describe, expect, it, vi } from 'vitest';
import { createPreferences } from '#lib/features/preferences/store.svelte.ts';
import { DEFAULT_PREFERENCES } from '#lib/features/preferences/schema.ts';
import type { PreferencesStorage } from '#lib/features/preferences/storage.ts';

function setup() {
	const storage = {
		read: vi.fn(() => DEFAULT_PREFERENCES),
		write: vi.fn()
	} satisfies PreferencesStorage;
	const el = document.createElement('html');
	return { storage, el, store: createPreferences(DEFAULT_PREFERENCES, storage, () => el) };
}

describe('createPreferences', () => {
	it('exposes the initial values', () => {
		const { store } = setup();
		expect(store.layout).toBe('vertical');
		expect(store.all).toEqual(DEFAULT_PREFERENCES);
	});
	it('set() updates state, storage and the html attribute', () => {
		const { store, storage, el } = setup();
		store.set({ mode: 'dark' });
		expect(store.mode).toBe('dark');
		expect(storage.write).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, mode: 'dark' });
		expect(el.getAttribute('data-mode')).toBe('dark');
	});
	it('reset() writes the defaults and restores all 11 attributes', () => {
		const { store, storage, el } = setup();
		store.set({
			mode: 'dark',
			palette: 'coral',
			dock: 'side',
			autoHideDock: 'on',
			density: 'compact'
		});
		storage.write.mockClear();
		store.reset();
		expect(storage.write).toHaveBeenCalledWith(DEFAULT_PREFERENCES);
		expect(el.getAttribute('data-mode')).toBe('light');
		expect(el.getAttribute('data-palette')).toBe('iris');
		expect(el.getAttribute('data-dock')).toBe('bottom');
		expect(el.getAttribute('data-dock-autohide')).toBe('off');
		expect(el.getAttribute('data-density')).toBe('comfortable');
		expect(el.getAttributeNames().filter((n) => n.startsWith('data-'))).toHaveLength(11);
	});
	it('writes the palette and the dock axes onto the html element', () => {
		const { store, el } = setup();
		store.set({ palette: 'emerald', dock: 'side', autoHideDock: 'on', density: 'compact' });
		expect(el.getAttribute('data-palette')).toBe('emerald');
		expect(el.getAttribute('data-dock')).toBe('side');
		expect(el.getAttribute('data-dock-autohide')).toBe('on');
		expect(el.getAttribute('data-density')).toBe('compact');
	});
	it('ignores a value outside the enum', () => {
		const { store, storage, el } = setup();
		store.set({ mode: 'nope' as never });
		expect(store.mode).toBe('light');
		expect(el.getAttribute('data-mode')).toBeNull();
		expect(storage.write).not.toHaveBeenCalled();
	});
	it('applies the valid keys of a mixed patch and drops the invalid ones', () => {
		const { store, storage } = setup();
		store.set({ mode: 'nope' as never, palette: 'ocean' });
		expect(store.palette).toBe('ocean');
		expect(store.mode).toBe('light');
		expect(storage.write).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, palette: 'ocean' });
	});
});
