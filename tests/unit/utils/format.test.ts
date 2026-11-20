import { beforeAll, describe, expect, it } from 'vitest';
import {
	formatBps,
	formatDate,
	formatDateTime,
	formatMoney,
	parseApiDate,
	relativeTime
} from '#lib/utils/format.ts';

// IST has no DST, so wall-clock expectations are stable. Must be set before any Date use.
beforeAll(() => {
	process.env.TZ = 'Asia/Kolkata';
});

describe('formatMoney (integer paise, en-IN grouping, always two decimals)', () => {
	it.each([
		[0, '₹0.00'],
		[1, '₹0.01'],
		[99, '₹0.99'],
		[100, '₹1.00'],
		[1000, '₹10.00'],
		[1234500, '₹12,345.00'],
		[12345678, '₹1,23,456.78'],
		[10000000, '₹1,00,000.00'],
		[1234567890, '₹1,23,45,678.90'],
		[100000000000, '₹1,00,00,00,000.00'],
		[-1, '-₹0.01'],
		[-1234500, '-₹12,345.00'],
		[-12345678, '-₹1,23,456.78']
	])('%i paise -> %s', (paise, expected) => {
		expect(formatMoney(paise)).toBe(expected);
	});

	it('is exact near the safe-integer limit (no float drift)', () => {
		expect(formatMoney(9007199254740991)).toBe('₹9,00,71,99,25,47,409.91');
	});

	it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 12.5])(
		'%s renders an em dash, never NaN or undefined',
		(bad) => {
			expect(formatMoney(bad as number | null | undefined)).toBe('—');
		}
	);
});

describe('formatBps (GST basis points)', () => {
	it.each([
		[0, '0%'],
		[500, '5%'],
		[1200, '12%'],
		[1800, '18%'],
		[1250, '12.5%'],
		[525, '5.25%'],
		[5, '0.05%'],
		[50, '0.5%'],
		[10000, '100%'],
		[-250, '-2.5%']
	])('%i bps -> %s', (bps, expected) => {
		expect(formatBps(bps)).toBe(expected);
	});

	it.each([null, undefined, Number.NaN, 12.5])('%s renders an em dash', (bad) => {
		expect(formatBps(bad as number | null | undefined)).toBe('—');
	});
});

describe('parseApiDate', () => {
	it('reads a date-only value as a LOCAL date, not UTC midnight', () => {
		const d = parseApiDate('2026-11-18');
		expect([d?.getFullYear(), d?.getMonth(), d?.getDate(), d?.getHours()]).toEqual([
			2026, 10, 18, 0
		]);
	});

	it('reads an RFC 3339 timestamp as an instant (offset honoured)', () => {
		expect(parseApiDate('2026-11-18T23:30:00+05:30')?.getTime()).toBe(
			Date.UTC(2026, 10, 18, 18, 0)
		);
		expect(parseApiDate('2026-11-18T18:00:00Z')?.getTime()).toBe(Date.UTC(2026, 10, 18, 18, 0));
	});

	it.each([
		null,
		undefined,
		'',
		'garbage',
		'2026-13-01',
		'2026-02-30',
		'2026-11-1',
		'2026',
		'12',
		'2026-11-18T',
		'20 6-11-18'
	])('%s -> null', (bad) => {
		expect(parseApiDate(bad)).toBeNull();
	});
});

describe('formatDate / formatDateTime', () => {
	it('date-only never shifts a day', () => {
		expect(formatDate('2026-11-18')).toBe('18 Nov 2026');
		expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
		expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
	});

	it('a timestamp is shown in local time, either side of midnight', () => {
		// 23:30 IST on the 18th = 18:00Z; 00:30 IST on the 19th = 19:00Z the 18th.
		expect(formatDate('2026-11-18T18:00:00Z')).toBe('18 Nov 2026');
		expect(formatDate('2026-11-18T19:00:00Z')).toBe('19 Nov 2026');
	});

	it('formatDateTime shows date and time', () => {
		expect(formatDateTime('2026-11-18T18:00:00Z')).toBe('18 Nov 2026, 11:30 pm');
		expect(formatDateTime('2026-11-18T19:00:00Z')).toBe('19 Nov 2026, 12:30 am');
	});

	it.each([null, undefined, '', 'nope'])('%s renders an em dash', (bad) => {
		expect(formatDate(bad)).toBe('—');
		expect(formatDateTime(bad)).toBe('—');
	});
});

describe('relativeTime', () => {
	const now = new Date('2026-11-18T12:00:00Z');
	it.each([
		['2026-11-18T11:59:30Z', 'just now'],
		['2026-11-18T12:00:20Z', 'just now'],
		['2026-11-18T11:55:00Z', '5 minutes ago'],
		['2026-11-18T11:59:00Z', '1 minute ago'],
		['2026-11-18T09:00:00Z', '3 hours ago'],
		['2026-11-16T12:00:00Z', '2 days ago'],
		['2026-11-17T12:00:00Z', 'yesterday'],
		['2026-11-18T15:00:00Z', 'in 3 hours'],
		['2026-11-21T12:00:00Z', 'in 3 days'],
		['2026-11-19T12:00:00Z', 'tomorrow']
	])('%s -> %s', (iso, expected) => {
		expect(relativeTime(iso, now)).toBe(expected);
	});

	it('falls back to the absolute date after 30 days', () => {
		expect(relativeTime('2026-09-01T12:00:00Z', now)).toBe('1 Sept 2026');
	});

	it.each([null, undefined, '', 'nope'])('%s renders an em dash', (bad) => {
		expect(relativeTime(bad, now)).toBe('—');
	});
});
