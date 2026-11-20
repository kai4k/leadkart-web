/**
 * The one place values are turned into display text: money, GST rates, dates, relative times.
 * Pure leaf: no feature imports, safe from components, view-models and services alike.
 *
 * Money and rates come from Go as integers (`*_paise`, GST basis points) and are formatted from the
 * integer, never through a float. Date-only values (`YYYY-MM-DD`) are calendar dates and are read as
 * LOCAL dates so they never shift a day; timestamps are RFC 3339 instants shown in local time.
 * A missing or invalid value is an em dash, never "undefined", "NaN" or "Invalid Date".
 */

/** India-first; the tenant locale preference is stored but not applied anywhere yet. */
const LOCALE = 'en-IN';
const EMPTY = '—';

const grouped = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat(LOCALE, {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit'
});
const relativeFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** Quotient and remainder of an integer, exact for any safe integer. */
function divmod(n: number, by: number): [number, number] {
	const rest = n % by;
	return [(n - rest) / by, rest];
}

/** Integer paise (Go `*_paise`) to "₹12,345.00"; lakh/crore grouping, always two decimals. */
export function formatMoney(paise: number | null | undefined): string {
	if (paise == null || !Number.isSafeInteger(paise)) return EMPTY;
	const [rupees, fraction] = divmod(Math.abs(paise), 100);
	const sign = paise < 0 ? '-' : '';
	return `${sign}₹${grouped.format(rupees)}.${String(fraction).padStart(2, '0')}`;
}

/** Go GST basis points (1200) to "12%", "12.5%", "5.25%". */
export function formatBps(bps: number | null | undefined): string {
	if (bps == null || !Number.isSafeInteger(bps)) return EMPTY;
	const [whole, hundredths] = divmod(Math.abs(bps), 100);
	const digits =
		hundredths % 10 === 0 ? String(hundredths / 10) : String(hundredths).padStart(2, '0');
	const fraction = hundredths === 0 ? '' : `.${digits}`;
	return `${bps < 0 ? '-' : ''}${grouped.format(whole)}${fraction}%`;
}

/** `YYYY-MM-DD` as a local calendar date; null when the shape or the calendar day is wrong. */
function parseDateOnly(value: string): Date | null {
	if (value[4] !== '-' || value[7] !== '-') return null;
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const date = new Date(2000, 0, 1);
	date.setFullYear(year, month - 1, day);
	const real =
		date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	return real ? date : null;
}

/** An API date-only value or RFC 3339 timestamp; null for empty or unparseable input. */
export function parseApiDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	if (value.length === 10) return parseDateOnly(value);
	if (!value.includes('T')) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** "18 Nov 2026". */
export function formatDate(value: string | null | undefined): string {
	const date = parseApiDate(value);
	return date ? dateFmt.format(date) : EMPTY;
}

/** "18 Nov 2026, 11:30 pm". */
export function formatDateTime(value: string | null | undefined): string {
	const date = parseApiDate(value);
	return date ? dateTimeFmt.format(date) : EMPTY;
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

/**
 * "just now" / "5 minutes ago" / "in 3 hours" / "yesterday"; the absolute date beyond 30 days.
 * `now` is a parameter so callers and tests control the clock.
 */
export function relativeTime(value: string | null | undefined, now: Date = new Date()): string {
	const date = parseApiDate(value);
	if (!date) return EMPTY;
	const diffMs = date.getTime() - now.getTime();
	const seconds = Math.abs(diffMs) / 1000;
	if (seconds < 45) return 'just now';
	const sign = diffMs >= 0 ? 1 : -1;
	if (seconds < HOUR) return relativeFmt.format(sign * Math.round(seconds / MINUTE), 'minute');
	if (seconds < DAY) return relativeFmt.format(sign * Math.round(seconds / HOUR), 'hour');
	if (seconds < 30 * DAY) return relativeFmt.format(sign * Math.round(seconds / DAY), 'day');
	return dateFmt.format(date);
}
