import { describe, expect, it } from 'vitest';
import { plainTitle } from '#lib/utils/page-title.ts';

describe('plainTitle', () => {
	it('strips bidi overrides, isolates, zero-width marks and control characters', () => {
		expect(plainTitle('Acme‮gnp.exe')).toBe('Acmegnp.exe');
		expect(plainTitle('A⁦b⁩c​d\u0007e\u007Ff')).toBe('Abcdef');
		expect(plainTitle('﻿Acme')).toBe('Acme');
	});
	it('keeps ordinary text, including right-to-left scripts, and collapses whitespace', () => {
		expect(plainTitle('  Acme   Pharma  ')).toBe('Acme Pharma');
		expect(plainTitle('شركة')).toBe('شركة');
	});
	it('is safe on a missing name', () => {
		expect(plainTitle(undefined)).toBe('');
		expect(plainTitle(null)).toBe('');
	});
});

describe('plainTitle: the refused set of the Go backend (table-tested from code points)', () => {
	const REFUSED: Array<[number, number]> = [
		[0x0000, 0x001f],
		[0x007f, 0x009f],
		[0x061c, 0x061c],
		[0x200e, 0x200f],
		[0x202a, 0x202e],
		[0x2066, 0x2069],
		[0x2028, 0x2029],
		[0x00ad, 0x00ad],
		[0x034f, 0x034f],
		[0x115f, 0x1160],
		[0x3164, 0x3164],
		[0xffa0, 0xffa0],
		[0x180e, 0x180e],
		[0x200b, 0x200b],
		[0x2060, 0x2064],
		[0x206a, 0x206f],
		[0xfeff, 0xfeff],
		[0xfff9, 0xfffc],
		[0xe0000, 0xe007f]
	];
	it('removes every code point in every refused range (both ends and the middle)', () => {
		for (const [lo, hi] of REFUSED)
			for (const cp of new Set([lo, hi, Math.floor((lo + hi) / 2)])) {
				// whitespace-class members (U+0009..U+000D, U+2028/9) become spaces and are collapsed: compare without them
				const out = plainTitle(`Ac${String.fromCodePoint(cp)}me`);
				expect(out.replace(/\s/g, ''), `U+${cp.toString(16)}`).toBe('Acme');
				expect(out, `U+${cp.toString(16)}`).not.toContain(String.fromCodePoint(cp));
			}
	});
	it('keeps ZWNJ and ZWJ inside a word and removes them at its edges', () => {
		expect(plainTitle('می‌خواهم')).toBe('می‌خواهم');
		expect(plainTitle('👩‍⚕️')).toBe('👩‍⚕️');
		expect(plainTitle('‌Acme‍')).toBe('Acme');
		expect(plainTitle('Acme ‌ Pharma')).toBe('Acme Pharma');
		expect(plainTitle('a‌‍b')).toBe('ab');
	});
});
