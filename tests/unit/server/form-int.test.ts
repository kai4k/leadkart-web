// @vitest-environment node
/**
 * The one way a form action reads a whole number from a posted field: digits only. Anything else is
 * not a number (NaN), which every request schema refuses, so what the screen calls invalid is never
 * saved as some other number (`Number('1e1')` is 10, `Number('0x10')` is 16, `Number('')` is 0).
 */
import { describe, expect, it } from 'vitest';
import { formInt } from '#lib/server/form-int.ts';

const fd = (value?: string | File) => {
	const f = new FormData();
	if (value !== undefined) f.set('n', value);
	return f;
};

describe('formInt', () => {
	it.each([
		['0', 0],
		['8', 8],
		['12', 12],
		['128', 128],
		['007', 7],
		['1440', 1440]
	])('%j is %i', (text, n) => {
		expect(formInt(fd(text), 'n')).toBe(n);
	});

	it.each([
		['exponent', '1e1'],
		['exponent, capital', '1E3'],
		['hex', '0x10'],
		['octal', '0o17'],
		['binary', '0b11'],
		['letters', 'abc'],
		['empty', ''],
		['spaces only', '   '],
		['a leading space', ' 12'],
		['a trailing space', '12 '],
		['a trailing newline', '12\n'],
		['a sign', '+12'],
		['negative', '-12'],
		['a decimal', '12.0'],
		['a decimal point', '12.'],
		['a group separator', '1,200'],
		['an underscore', '1_000'],
		['Infinity', 'Infinity'],
		['NaN', 'NaN'],
		['Devanagari digits', '१२'],
		['full-width digits', '１２'],
		['more digits than a number holds exactly', '9007199254740993'],
		['a very long run of digits', '9'.repeat(400)]
	])('%s (%j) is not a number', (_label, text) => {
		expect(formInt(fd(text), 'n')).toBeNaN();
	});

	it('a missing field and a file are not numbers', () => {
		expect(formInt(fd(), 'n')).toBeNaN();
		expect(formInt(fd(new File(['12'], '12.txt')), 'n')).toBeNaN();
	});
});
