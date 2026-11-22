import { describe, expect, it } from 'vitest';
import { toSingleLine } from '#lib/utils/single-line.ts';

describe('toSingleLine', () => {
	it.each([
		['a\nb', 'a b'],
		['a\r\nb', 'a b'],
		['a\n\n\nb', 'a b'],
		['a\tb', 'a b'],
		['a b c', 'a b c'],
		['no breaks', 'no breaks'],
		['क्‍ष', 'क्‍ष'],
		['می‌خواهم', 'می‌خواهم']
	])('%j -> %j', (input, out) => {
		expect(toSingleLine(input)).toBe(out);
	});
});
