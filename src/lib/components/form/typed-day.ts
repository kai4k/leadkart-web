import type { DateValue } from '@internationalized/date';

/**
 * Typing a date day-first has a trap in bits-ui's DateField: the day is limited by the month AND the year as they are
 * typed, so `29 / 02 / 2024` is cut to `28` at the first digit of the year (0002 is not a leap year) and is never
 * restored when the year is complete. This remembers the day the user actually typed (the largest day shown on the day
 * segment before a year keystroke) and puts it back once the date is complete, but only if the month really has that day.
 * `31 / 02 / 2026` stays the 28th (constrained, as bits-ui does); `29 / 02 / 2024` is the 29th. Any key on the day segment
 * resets it (the user is editing the day again).
 *
 * `capture(e)` is the field group's keydown (capture phase); `restore(next)` takes the value bits-ui reported and returns
 * it with the typed day put back (or `next` itself).
 */
export function createTypedDay() {
	let intended: number | null = null;
	return {
		capture(e: KeyboardEvent): void {
			const group = e.currentTarget as Element | null;
			const part = (e.target as Element | null)
				?.closest('[data-segment]')
				?.getAttribute('data-segment');
			if (part === 'day') intended = null;
			else if (part === 'year' && /^[0-9]$/.test(e.key)) {
				const n = Number(group?.querySelector('[data-segment="day"]')?.textContent?.trim());
				if (Number.isInteger(n) && n > 0) intended = Math.max(intended ?? 0, n);
			}
		},
		restore<T extends DateValue | undefined>(next: T): T {
			if (!next || intended === null || next.year < 1000 || next.day >= intended) return next;
			const fixed = next.set({ day: intended });
			return (fixed.day === intended ? fixed : next) as T;
		}
	};
}
