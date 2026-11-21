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
