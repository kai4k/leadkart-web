import { afterEach, describe, expect, it } from 'vitest';
import { currentYear } from '#lib/utils/format.ts';

/**
 * SSR renders on a UTC server, the browser in the viewer's zone. Anything the server renders from
 * the clock must read the same on both, or hydration keeps the server's text (a wrong date) and
 * warns about a mismatch. `currentYear` is zone-free (UTC), so it must not move with TZ.
 */
const ORIGINAL_TZ = process.env.TZ;
afterEach(() => {
	if (ORIGINAL_TZ === undefined) delete process.env.TZ;
	else process.env.TZ = ORIGINAL_TZ;
});

// 20:00 UTC on New Year's Eve is already 01:30 on 1 January in India.
const BOUNDARY = new Date('2026-12-31T20:00:00Z');

describe('currentYear (the footer copyright year)', () => {
	it('the local year really differs between a UTC server and an IST browser at the boundary', () => {
		process.env.TZ = 'UTC';
		const server = BOUNDARY.getFullYear();
		process.env.TZ = 'Asia/Kolkata';
		const browser = BOUNDARY.getFullYear();
		expect([server, browser]).toEqual([2026, 2027]);
	});

	it.each(['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland'])(
		'is the same under TZ=%s',
		(tz) => {
			process.env.TZ = tz;
			expect(currentYear(BOUNDARY)).toBe(2026);
		}
	);

	it('rolls over at midnight UTC', () => {
		expect(currentYear(new Date('2026-12-31T23:59:59Z'))).toBe(2026);
		expect(currentYear(new Date('2027-01-01T00:00:00Z'))).toBe(2027);
	});
});
