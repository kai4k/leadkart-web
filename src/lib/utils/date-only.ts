/**
 * Calendar dates as business data: a date picked in the UI is a CALENDAR date (no time, no zone), carried on the wire as
 * ISO `YYYY-MM-DD` and shown day-first in the business locale (`BUSINESS_LOCALE`, en-IN). Nothing here touches `Date`:
 * a `Date` built from a calendar date is zone-dependent (`2026-01-01` is `2025-12-31T18:30Z` in India), and
 * `Date#toISOString().slice(0, 10)` shifts the day by the browser's offset. A `CalendarDate` has no zone, so the
 * round trip `fromDateOnly(toDateOnly(d))` is the same calendar date whatever zone the browser is in.
 */
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date';

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
