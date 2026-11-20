import { describe, expect, it } from 'vitest';
import { formatPlainNumber, parseLocaleNumber } from '#lib/utils/parse-number.ts';

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

describe('parseLocaleNumber: group separators sit only where the locale groups (fix round B)', () => {
	// [text, locale, expected]; null = refused
	const table: Array<[string, string, number | null]> = [
		['1,5', 'en', null],
		['1,,2', 'en', null],
		['1,', 'en', null],
		['12,34', 'en', null],
		['1,234', 'en', 1234],
		['12,345,678', 'en-US', 12345678],
		['1234,567', 'en-US', null],
		['1,23,456', 'en-IN', 123456],
		['12,34,567', 'en-IN', 1234567],
		// international 3/3 grouping is also read where the locale groups 3/2/2 (a pasted "100,000");
		// "1,234" is the same number under both groupings
		['1,234,567', 'en-IN', 1234567],
		['100,000', 'en-IN', 100000],
		['1,234', 'en-IN', 1234],
		['12,34,567,890', 'en-IN', null],
		['1,2345,678', 'en-IN', null],
		['1,5', 'en-IN', null],
		['1,23,45', 'en-IN', null],
		['1,23,456', 'hi', 123456],
		['1,5', 'hi', null],
		['1.234,5', 'de', 1234.5],
		['1,5', 'de', 1.5],
		['1.5', 'de', null],
		['12.34', 'de', null],
		['1,234', 'de', 1.234]
	];
	it.each(table)('%s in %s -> %s', (text, locale, expected) => {
		expect(parseLocaleNumber(text, locale)).toBe(expected);
	});

	it('reads the locale digits (Devanagari in hi, Arabic-Indic) and the typographic minus', () => {
		expect(parseLocaleNumber('१२३', 'hi')).toBe(123);
		expect(parseLocaleNumber('१,२३,४५६.५', 'hi')).toBe(123456.5);
		expect(parseLocaleNumber('٤٢', 'ar')).toBe(42);
		expect(parseLocaleNumber('−5', 'sv')).toBe(-5);
		expect(parseLocaleNumber('-1,50,000', 'en-IN')).toBe(-150000);
	});
	it('keeps the 64-character bound with locale digits', () => {
		expect(parseLocaleNumber('१'.repeat(65), 'hi')).toBeNull();
	});
});

describe('formatPlainNumber: what the field shows re-parses to the same number', () => {
	it.each([
		[1234.5, 'de'],
		[1234.5, 'en-IN'],
		[-0.25, 'de'],
		[1234567, 'hi'],
		[1e21, 'en']
	])('%s in %s', (n, locale) => {
		const shown = formatPlainNumber(n, locale);
		expect(shown.split('').some((c) => c.trim() === '')).toBe(false);
		expect(parseLocaleNumber(shown, locale)).toBe(n);
	});
	it('uses the locale decimal separator and no grouping', () => {
		expect(formatPlainNumber(1234.5, 'de')).toBe('1234,5');
		expect(formatPlainNumber(1234.5, 'en-IN')).toBe('1234.5');
	});
});
