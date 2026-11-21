/**
 * A picked calendar date must round-trip as the same calendar date in any browser zone. The zone is set BEFORE any Date
 * is created (Node reads TZ lazily; a process-wide change is honoured until the first Date use), and each case below
 * also runs a hostile `Date` comparison to show that the zone really differs from the calendar date.
 */
process.env.TZ = 'Asia/Kolkata';

import { afterAll, describe, expect, it } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { fromDateOnly, toDateOnly } from '#lib/utils/date-only.ts';

const ZONES = [
	'Asia/Kolkata',
	'America/Los_Angeles',
	'Pacific/Kiritimati',
	'Pacific/Pago_Pago',
	'UTC'
];
const original = process.env.TZ;
afterAll(() => {
	process.env.TZ = original;
});

describe.each(ZONES)('time zone %s', (zone) => {
	const use = () => {
		process.env.TZ = zone;
	};
	it('toDateOnly keeps the calendar date (New Year, leap day, year ends)', () => {
		use();
		expect(toDateOnly(new CalendarDate(2026, 1, 1))).toBe('2026-01-01');
		expect(toDateOnly(new CalendarDate(2024, 2, 29))).toBe('2024-02-29');
		expect(toDateOnly(new CalendarDate(2026, 12, 31))).toBe('2026-12-31');
	});
	it('fromDateOnly(toDateOnly(d)) is the same calendar date, 1900 to 2100', () => {
		use();
		for (const [y, m, d] of [
			[1900, 1, 1],
			[1999, 12, 31],
			[2026, 3, 29], // a daylight-saving boundary somewhere
			[2026, 10, 25],
			[2100, 2, 28]
		] as const) {
			const date = new CalendarDate(y, m, d);
			const round = fromDateOnly(toDateOnly(date))!;
			expect([round.year, round.month, round.day]).toEqual([y, m, d]);
		}
	});
	it('a Date is NOT a safe carrier: it can move the day (why nothing here uses one)', () => {
		use();
		// midnight local time, serialised in UTC, is a different calendar date east of UTC
		const local = new Date(2026, 0, 1);
		const viaIso = local.toISOString().slice(0, 10);
		if (zone === 'Asia/Kolkata' || zone === 'Pacific/Kiritimati') expect(viaIso).toBe('2025-12-31');
		expect(toDateOnly(new CalendarDate(2026, 1, 1))).toBe('2026-01-01');
	});
});

describe('toDateOnly / fromDateOnly input rules', () => {
	it('toDateOnly of nothing is an empty string', () => {
		expect(toDateOnly(undefined)).toBe('');
		expect(toDateOnly(null)).toBe('');
	});
	it.each([
		'2026-02-30',
		'2026-13-01',
		'2026-00-10',
		'10/05/2026',
		'2026-5-1',
		'',
		'2026-05-10T00:00:00Z',
		' 2026-05-10'
	])('fromDateOnly refuses %j', (s) => {
		expect(fromDateOnly(s)).toBeUndefined();
	});
	it('fromDateOnly refuses a leap day in a common year and accepts it in a leap year', () => {
		expect(fromDateOnly('2026-02-29')).toBeUndefined();
		expect(fromDateOnly('2024-02-29')?.toString()).toBe('2024-02-29');
	});
	it('fromDateOnly(undefined | null) is undefined', () => {
		expect(fromDateOnly(undefined)).toBeUndefined();
		expect(fromDateOnly(null)).toBeUndefined();
	});
});
