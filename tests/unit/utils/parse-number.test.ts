import { describe, expect, it } from 'vitest';
import { parseLocaleNumber } from '#lib/utils/parse-number.ts';

describe('parseLocaleNumber', () => {
	it('reads Indian grouping in en-IN', () => {
		expect(parseLocaleNumber('1,00,000', 'en-IN')).toBe(100000);
		expect(parseLocaleNumber('12,34,567.5', 'en-IN')).toBe(1234567.5);
	});

	it('reads western grouping and plain decimals', () => {
		expect(parseLocaleNumber('1,234.5', 'en-US')).toBe(1234.5);
		expect(parseLocaleNumber('1.5', 'en')).toBe(1.5);
		expect(parseLocaleNumber('-42', 'en')).toBe(-42);
		expect(parseLocaleNumber('.5', 'en')).toBe(0.5);
	});

	it('reads a comma decimal where the locale uses one', () => {
		expect(parseLocaleNumber('1.234,5', 'de')).toBe(1234.5);
	});

	it('refuses anything that is not one plain number', () => {
		for (const bad of ['', '  ', 'abc', '1e5', '1.2.3', '1,2,x', ',5', '--1', '5-', '1 2 x']) {
			expect(parseLocaleNumber(bad, 'en-IN')).toBeNull();
		}
	});

	it('refuses very long input before scanning it', () => {
		expect(parseLocaleNumber('1'.repeat(65), 'en')).toBeNull();
		expect(parseLocaleNumber('1'.repeat(64), 'en')).not.toBeNull();
	});

	it('falls back to en conventions for an unknown locale tag', () => {
		expect(parseLocaleNumber('1,000.5', 'not a locale')).toBe(1000.5);
	});
});
