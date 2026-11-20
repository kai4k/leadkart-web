import { afterEach, describe, expect, it } from 'vitest';
import { negotiateLocale, readDocumentLocale } from '#lib/i18n/index.ts';

describe('negotiateLocale', () => {
	it.each([
		['hi-IN,hi;q=0.9,en;q=0.8', 'hi'],
		['en-GB,hi;q=0.5', 'en'],
		['fr', 'en'],
		[null, 'en'],
		['', 'en'],
		['hi;q=0,en', 'en'],
		['hi', 'hi'],
		['HI-in', 'hi'],
		['fr, hi;q=0.4, en;q=0.2', 'hi'],
		['en;q=0.5, hi;q=0.5', 'en'],
		['*', 'en'],
		['hi;q=banana', 'en'],
		['hi;q=2', 'en'],
		['hi;q=-1, en;q=0.1', 'en']
	] as const)('negotiates %j as %s', (header, expected) => {
		expect(negotiateLocale(header)).toBe(expected);
	});

	it('copes with hostile header text: oversized, many entries, control characters', () => {
		const huge = `${'x'.repeat(100_000)},hi`;
		expect(negotiateLocale(huge)).toBe('en');
		const many = `${Array.from({ length: 5_000 }, () => 'fr').join(',')},hi`;
		expect(negotiateLocale(many)).toBe('en');
		expect(negotiateLocale('hi\u0000;q=1\r\n,en')).toBe('en');
		expect(negotiateLocale('"><script>,hi;q=0.9')).toBe('hi');
	});
});

describe('readDocumentLocale', () => {
	afterEach(() => document.documentElement.setAttribute('lang', 'en'));

	it('reads a supported <html lang>', () => {
		document.documentElement.setAttribute('lang', 'hi');
		expect(readDocumentLocale()).toBe('hi');
	});
	it('falls back to en for an unsupported or missing lang', () => {
		document.documentElement.setAttribute('lang', 'fr');
		expect(readDocumentLocale()).toBe('en');
		document.documentElement.removeAttribute('lang');
		expect(readDocumentLocale()).toBe('en');
	});
});
