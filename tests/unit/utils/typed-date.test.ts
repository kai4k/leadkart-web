import { describe, expect, it } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import {
	EMPTY_PARTS,
	backspace,
	commit,
	layoutFor,
	partsOf,
	resolve,
	step,
	typeDigit,
	yearBounds,
	type Parts
} from '#lib/utils/typed-date.ts';

const bounds = { from: 1900, to: 2100 };
const typed = (digits: string, from: Parts = EMPTY_PARTS) => {
	let parts = from;
	const order = ['day', 'month', 'year'] as const;
	let at = 0;
	for (const d of digits) {
		const r = typeDigit(parts, order[at]!, d);
		parts = r.parts;
		if (r.advance) at++;
	}
	return parts;
};

describe('typed-date: typing', () => {
	it('keeps what is typed: 31 / 02 / 2026 is three segments, not a different date', () => {
		expect(typed('31022026')).toEqual({ day: '31', month: '02', year: '2026' });
	});
	it('a first digit that can only be a whole day or month completes it', () => {
		expect(typed('5').day).toBe('05');
		expect(typed('3').day).toBe('3');
		expect(typed('9', { ...EMPTY_PARTS, day: '10' }).day).toBe('09');
	});
	it('a too-big second digit restarts the segment with that digit', () => {
		expect(typed('32').day).toBe('2');
		expect(typeDigit({ ...EMPTY_PARTS, month: '1' }, 'month', '3').parts.month).toBe('03');
		expect(typeDigit({ ...EMPTY_PARTS, day: '0' }, 'day', '0').parts.day).toBe('0');
	});
	it('the year takes four digits and restarts on the fifth', () => {
		expect(typeDigit({ ...EMPTY_PARTS, year: '2026' }, 'year', '1').parts.year).toBe('1');
	});
	it('Backspace removes the last digit; commit pads a lone digit but leaves a lone zero', () => {
		expect(backspace({ ...EMPTY_PARTS, year: '2026' }, 'year').year).toBe('202');
		expect(commit({ ...EMPTY_PARTS, day: '1' }, 'day').day).toBe('01');
		expect(commit({ ...EMPTY_PARTS, day: '0' }, 'day').day).toBe('0');
	});
});

describe('typed-date: resolve', () => {
	const r = (p: Partial<Parts>) => resolve({ ...EMPTY_PARTS, ...p }, { bounds });
	it('nothing typed is empty; an unfinished entry is partial, whatever the year digits', () => {
		expect(r({}).status).toBe('empty');
		expect(r({ day: '10', month: '05', year: '26' }).status).toBe('partial');
		expect(r({ day: '1', month: '05', year: '2026' }).status).toBe('partial');
		expect(r({ day: '10' }).status).toBe('partial');
	});
	it('a complete real date is valid and is exactly the typed day, month and year', () => {
		const v = r({ day: '29', month: '02', year: '2024' });
		expect(v.status === 'valid' && v.date.toString()).toBe('2024-02-29');
	});
	it.each([
		['31', '02', '2026'],
		['29', '02', '2026'],
		['29', '02', '1900'],
		['31', '04', '2026'],
		['30', '02', '2024']
	])('%s/%s/%s does not exist', (day, month, year) => {
		expect(r({ day, month, year })).toEqual({ status: 'invalid', reason: 'notExist' });
	});
	it('a four-digit year outside the bounds is invalid even when day and month are not typed', () => {
		expect(r({ year: '0026' })).toEqual({ status: 'invalid', reason: 'yearRange' });
		expect(r({ year: '2101' })).toEqual({ status: 'invalid', reason: 'yearRange' });
		expect(r({ year: '2100' }).status).toBe('partial');
	});
	it('min and max values are invalid, never adjusted', () => {
		const p = { day: '10', month: '05', year: '2026' };
		expect(resolve(p, { bounds, minValue: new CalendarDate(2026, 6, 1) })).toEqual({
			status: 'invalid',
			reason: 'beforeMin'
		});
		expect(resolve(p, { bounds, maxValue: new CalendarDate(2026, 5, 9) })).toEqual({
			status: 'invalid',
			reason: 'afterMax'
		});
	});
});

describe('typed-date: stepping, layout, bounds', () => {
	it('the day wraps at the length of the month shown; month wraps; year clamps', () => {
		const feb = { day: '28', month: '02', year: '2026' };
		expect(step(feb, 'day', 1, bounds, 2026).day).toBe('01');
		expect(step({ ...feb, year: '2024' }, 'day', 1, bounds, 2026).day).toBe('29');
		expect(step(feb, 'day', -1, bounds, 2026).day).toBe('27');
		expect(step({ ...feb, day: '01' }, 'day', -1, bounds, 2026).day).toBe('28');
		expect(step({ ...feb, month: '12' }, 'month', 1, bounds, 2026).month).toBe('01');
		expect(step({ ...EMPTY_PARTS, year: '2100' }, 'year', 1, bounds, 2026).year).toBe('2100');
		expect(step(EMPTY_PARTS, 'year', 1, bounds, 2026).year).toBe('2026');
		expect(step(EMPTY_PARTS, 'day', 1, bounds, 2026).day).toBe('01');
		expect(step(EMPTY_PARTS, 'day', -1, bounds, 2026).day).toBe('31');
	});
	it('en-IN is day / month / year with a slash; partsOf pads', () => {
		expect(layoutFor('en-IN')).toEqual({ order: ['day', 'month', 'year'], separator: '/' });
		expect(layoutFor('en-US').order).toEqual(['month', 'day', 'year']);
		expect(partsOf(new CalendarDate(26, 5, 3))).toEqual({ day: '03', month: '05', year: '0026' });
		expect(partsOf(undefined)).toEqual(EMPTY_PARTS);
	});
	it('year bounds default to 1900 and ten years ahead, or follow min / max', () => {
		expect(yearBounds(undefined, undefined, undefined, undefined, 2026)).toEqual({
			from: 1900,
			to: 2036
		});
		expect(
			yearBounds(
				undefined,
				undefined,
				new CalendarDate(2000, 1, 1),
				new CalendarDate(2030, 1, 1),
				2026
			)
		).toEqual({ from: 2000, to: 2030 });
	});
});
