import { afterEach, describe, expect, it } from 'vitest';
import {
	ENABLED_LOCALES,
	KNOWN_LOCALES,
	negotiateLocale,
	readDocumentLocale,
	type AppLocale
} from '#lib/i18n/index.ts';

/** The two-locale behaviour (the product ships English only, see ENABLED_LOCALES). */
const BOTH: readonly AppLocale[] = ['en', 'hi'];

describe('English only for now (owner decision 2026-11-21)', () => {
	it('enables English alone; Hindi is known but disabled', () => {
		expect([...ENABLED_LOCALES]).toEqual(['en']);
		expect([...KNOWN_LOCALES]).toEqual(['en', 'hi']);
	});
	it.each(['hi-IN', 'hi', 'hi-IN,hi;q=0.9,en;q=0.8', 'hi;q=1, en;q=0.1', 'HI-in'])(
		'a Hindi browser (%s) is served English',
		(header) => {
			expect(negotiateLocale(header)).toBe('en');
		}
	);
	it('enabling hi restores the negotiation', () => {
		expect(negotiateLocale('hi-IN,hi;q=0.9,en;q=0.8', ['en', 'hi'])).toBe('hi');
		expect(negotiateLocale('hi-IN', ['en'])).toBe('en');
	});
});

describe('negotiateLocale (both locales enabled)', () => {
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
		expect(negotiateLocale(header, BOTH)).toBe(expected);
	});

	it('copes with hostile header text: oversized, many entries, control characters', () => {
		const huge = `${'x'.repeat(100_000)},hi`;
		expect(negotiateLocale(huge, BOTH)).toBe('en');
		const many = `${Array.from({ length: 5_000 }, () => 'fr').join(',')},hi`;
		expect(negotiateLocale(many, BOTH)).toBe('en');
		expect(negotiateLocale('hi\u0000;q=1\r\n,en', BOTH)).toBe('en');
		expect(negotiateLocale('"><script>,hi;q=0.9', BOTH)).toBe('hi');
	});
});

describe('readDocumentLocale', () => {
	afterEach(() => document.documentElement.setAttribute('lang', 'en'));

	it('reads an enabled <html lang>', () => {
		document.documentElement.setAttribute('lang', 'hi');
		expect(readDocumentLocale(BOTH)).toBe('hi');
		// while hi is disabled the client starts in English even if a stale document says hi
		expect(readDocumentLocale()).toBe('en');
	});
	it('falls back to en for an unsupported or missing lang', () => {
		document.documentElement.setAttribute('lang', 'fr');
		expect(readDocumentLocale()).toBe('en');
		document.documentElement.removeAttribute('lang');
		expect(readDocumentLocale()).toBe('en');
	});
});
