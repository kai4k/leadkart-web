import { describe, expect, it } from 'vitest';
import { quickModeTarget } from '#lib/layouts/mode-toggle.ts';

describe('quickModeTarget', () => {
	it('cycles light and dark', () => {
		expect(quickModeTarget('light')).toBe('dark');
		expect(quickModeTarget('dark')).toBe('light');
	});
	it('does not overwrite auto or black-white (the caller opens the customizer)', () => {
		expect(quickModeTarget('auto')).toBeNull();
		expect(quickModeTarget('black-white')).toBeNull();
	});
});
