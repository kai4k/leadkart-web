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
	it('reset() writes the defaults and restores all 9 attributes', () => {
		const { store, storage, el } = setup();
		store.set({ mode: 'dark', colors: 'teal' });
		storage.write.mockClear();
		store.reset();
		expect(storage.write).toHaveBeenCalledWith(DEFAULT_PREFERENCES);
		expect(el.getAttribute('data-mode')).toBe('light');
		expect(el.getAttribute('data-colors')).toBe('leadkart');
		expect(el.getAttributeNames().filter((n) => n.startsWith('data-'))).toHaveLength(9);
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
		store.set({ mode: 'nope' as never, colors: 'teal' });
		expect(store.colors).toBe('teal');
		expect(store.mode).toBe('light');
		expect(storage.write).toHaveBeenCalledWith({ ...DEFAULT_PREFERENCES, colors: 'teal' });
	});
});
