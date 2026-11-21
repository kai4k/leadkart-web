/**
 * Calendar dates as business data: a date picked in the UI is a CALENDAR date (no time, no zone), carried on the wire as
 * ISO `YYYY-MM-DD` and shown day-first in the business locale (`BUSINESS_LOCALE`, en-IN). Nothing here touches `Date`:
 * a `Date` built from a calendar date is zone-dependent (`2026-01-01` is `2025-12-31T18:30Z` in India), and
 * `Date#toISOString().slice(0, 10)` shifts the day by the browser's offset. A `CalendarDate` has no zone, so the
 * round trip `fromDateOnly(toDateOnly(d))` is the same calendar date whatever zone the browser is in.
 */
import {
	CalendarDate,
	getLocalTimeZone,
	parseDate,
	today,
	type DateValue
} from '@internationalized/date';

/** `2026-05-10`, or `''` when there is no date. */
export function toDateOnly(v: DateValue | undefined | null): string {
	return v ? new CalendarDate(v.calendar, v.era, v.year, v.month, v.day).toString() : '';
}

/** The calendar date of a `YYYY-MM-DD` string, or `undefined` for anything else (`2026-02-30`, `10/05/2026`, ''). */
export function fromDateOnly(s: string | undefined | null): CalendarDate | undefined {
	if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
	try {
		const d = parseDate(s);
		return d.toString() === s ? d : undefined;
	} catch {
		return undefined;
	}
}

/** The latest leap year at or before `year` (2026 -> 2024, 2000 -> 2000, 1900 -> 1896). */
export function latestLeapYear(year: number): number {
	let y = year;
	while (!(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) y--;
	return y;
}

/**
 * The placeholder of a TYPED date field: today's month and day in the latest leap year. bits-ui limits a typed day by the
 * month using the placeholder's year, so with a common year as the placeholder `29 / 02` is cut to 28 before the year is
 * typed (even when the year then typed is a leap year). A leap placeholder lets 29 February through; a non-leap year typed
 * after it is then constrained to the 28th by bits-ui. Only the field uses this: the calendar keeps the real today.
 */
export function typedFieldPlaceholder(): CalendarDate {
	const t = today(getLocalTimeZone());
	return new CalendarDate(latestLeapYear(t.year), t.month, Math.min(t.day, 28));
}
