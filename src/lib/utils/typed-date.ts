/**
 * The rules of a TYPED date: three segments (day, month, year) that keep exactly what the user typed. Pure functions, no
 * DOM, no `Date`. The field never adjusts a date: `31 / 02 / 2026` stays `31 / 02 / 2026` and is reported as invalid
 * (`notExist`), and a year with fewer than four digits is not a year yet (`partial`), so the only thing a form ever
 * receives is a real calendar date inside the allowed years.
 *
 * Segment text: day and month are `''`, one digit (waiting for a second), or two digits; the year is `''` to four digits.
 * A first digit that can only be a whole day or month (day 4 to 9, month 2 to 9) completes the segment (`5` becomes `05`).
 */
import { CalendarDate, type DateValue } from '@internationalized/date';

export type Part = 'day' | 'month' | 'year';
export type Parts = Record<Part, string>;

export const EMPTY_PARTS: Parts = { day: '', month: '', year: '' };

export type YearBounds = { from: number; to: number };

export type Resolved =
	| { status: 'empty' }
	| { status: 'partial' }
	| { status: 'valid'; date: CalendarDate }
	| { status: 'invalid'; reason: 'yearRange' | 'notExist' | 'beforeMin' | 'afterMax' };

const pad2 = (n: number) => String(n).padStart(2, '0');

function isLeapYear(y: number): boolean {
	return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

function daysInMonth(month: number, year: number): number {
	if (month === 2) return isLeapYear(year) ? 29 : 28;
	return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** The segments of a date as they are displayed (`10`, `05`, `2026`). */
export function partsOf(v: DateValue | undefined | null): Parts {
	return v
		? { day: pad2(v.day), month: pad2(v.month), year: String(v.year).padStart(4, '0') }
		: { ...EMPTY_PARTS };
}

/** The year dropdown's and the typed year's bounds: explicit years, else the min / max date's year, else 1900 to +10. */
export function yearBounds(
	minYear: number | undefined,
	maxYear: number | undefined,
	minValue: DateValue | undefined,
	maxValue: DateValue | undefined,
	thisYear: number
): YearBounds {
	return {
		from: minYear ?? minValue?.year ?? 1900,
		to: maxYear ?? maxValue?.year ?? thisYear + 10
	};
}

const isFilled = (part: Part, text: string) =>
	part === 'year' ? text.length === 4 : text.length === 2 && Number(text) >= 1;

/** Type one digit into a segment. `advance` is true when the segment is now complete and focus should move on. */
export function typeDigit(
	parts: Parts,
	part: Part,
	digit: string
): { parts: Parts; advance: boolean } {
	const cur = parts[part];
	if (part === 'year') {
		const next = cur.length >= 4 ? digit : cur + digit;
		return { parts: { ...parts, year: next }, advance: false };
	}
	const max = part === 'day' ? 31 : 12;
	const lastWaiting = part === 'day' ? 3 : 1; // the largest first digit that can still take a second
	const restart = (k: string) => (k === '0' || Number(k) <= lastWaiting ? k : `0${k}`);
	let next: string;
	if (cur.length === 1 && Number(cur + digit) >= 1 && Number(cur + digit) <= max)
		next = cur + digit;
	else next = restart(digit);
	return { parts: { ...parts, [part]: next }, advance: next.length === 2 };
}

/** Backspace removes the last digit of a segment. */
export function backspace(parts: Parts, part: Part): Parts {
	return { ...parts, [part]: parts[part].slice(0, -1) };
}

/** Up (+1) or Down (-1): day and month wrap; the day wraps at the length of the month when both are known; the year clamps. */
export function step(
	parts: Parts,
	part: Part,
	dir: 1 | -1,
	bounds: YearBounds,
	thisYear: number
): Parts {
	const cur = parts[part];
	if (part === 'year') {
		const base =
			cur.length === 4 ? Number(cur) : Math.min(Math.max(thisYear, bounds.from), bounds.to);
		const n = cur.length === 4 ? Math.min(Math.max(base + dir, bounds.from), bounds.to) : base;
		return { ...parts, year: String(n).padStart(4, '0') };
	}
	let max = part === 'month' ? 12 : 31;
	if (part === 'day' && isFilled('month', parts.month) && parts.year.length === 4)
		max = daysInMonth(Number(parts.month), Number(parts.year));
	const n = cur === '' ? null : Number(cur);
	let next: number;
	if (n === null || n < 1) next = dir > 0 ? 1 : max;
	else next = n + dir > max ? 1 : n + dir < 1 ? max : n + dir;
	return { ...parts, [part]: pad2(next) };
}

/** On leaving a segment: one non-zero digit is padded (`1` becomes `01`). A lone `0` stays: it is not a day or month. */
export function commit(parts: Parts, part: Part): Parts {
	const cur = parts[part];
	return part !== 'year' && cur.length === 1 && cur !== '0'
		? { ...parts, [part]: `0${cur}` }
		: parts;
}

/** What the segments mean: nothing, not yet a date, a real date, or a complete entry that is not an acceptable date. */
export function resolve(
	parts: Parts,
	opts: { bounds: YearBounds; minValue?: DateValue; maxValue?: DateValue }
): Resolved {
	const { day, month, year } = parts;
	if (day === '' && month === '' && year === '') return { status: 'empty' };
	if (year.length === 4 && (Number(year) < opts.bounds.from || Number(year) > opts.bounds.to))
		return { status: 'invalid', reason: 'yearRange' };
	if (!isFilled('day', day) || !isFilled('month', month) || !isFilled('year', year))
		return { status: 'partial' };
	const [d, m, y] = [Number(day), Number(month), Number(year)];
	if (d > daysInMonth(m, y)) return { status: 'invalid', reason: 'notExist' };
	const date = new CalendarDate(y, m, d);
	if (opts.minValue && date.compare(opts.minValue) < 0)
		return { status: 'invalid', reason: 'beforeMin' };
	if (opts.maxValue && date.compare(opts.maxValue) > 0)
		return { status: 'invalid', reason: 'afterMax' };
	return { status: 'valid', date };
}

/** The order of the parts and the separator for a locale (en-IN: day / month / year with `/`). */
export function layoutFor(locale: string): { order: Part[]; separator: string } {
	const parts = new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).formatToParts(new Date(2000, 0, 1));
	const order = parts
		.map((p) => p.type)
		.filter((t): t is Part => t === 'day' || t === 'month' || t === 'year');
	const separator = parts.find((p) => p.type === 'literal')?.value.trim() || '/';
	return { order: order.length === 3 ? order : ['day', 'month', 'year'], separator };
}
