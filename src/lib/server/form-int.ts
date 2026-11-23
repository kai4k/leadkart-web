/**
 * The ONE way a form action reads a whole number from a posted field.
 *
 * `Number()` is not a parser for what a person typed: it reads `1e1` as 10, `0x10` as 16 and an
 * empty field as 0, so a value the screen calls invalid was saved as some other number. Here a field
 * is a number only when it is digits and nothing else; everything else is NaN, which every request
 * schema refuses (`z.number()`), so the action answers a validation failure on that field and
 * nothing is sent.
 */
const DIGITS = /^\d+$/;

export function formInt(form: FormData, key: string): number {
	const raw = form.get(key);
	// `\d` without the `u` flag is ASCII 0-9 only; a missing field or an uploaded file is no number.
	if (typeof raw !== 'string' || !DIGITS.test(raw)) return Number.NaN;
	const n = Number(raw);
	// more digits than a number holds exactly would be saved as a neighbour of what was typed
	return Number.isSafeInteger(n) ? n : Number.NaN;
}
