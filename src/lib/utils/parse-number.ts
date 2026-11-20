/**
 * Parse a number the way a person in `locale` writes it: "1,00,000" (en-IN), "1,234.5" (en-US),
 * "1.234,5" (de). The group and decimal separators come from `Intl.NumberFormat`, so the product's
 * own Indian grouping is read correctly instead of being rejected by `Number()`.
 *
 * Returns `null` for anything that is not one plain number. Input longer than `MAX_LENGTH` is
 * refused before it is looked at, and the scan is a single pass with no regular expression.
 */
const MAX_LENGTH = 64;

type Separators = { group: string; decimal: string };

const cache = new Map<string, Separators>();

function separatorsFor(locale: string): Separators {
	const hit = cache.get(locale);
	if (hit) return hit;
	let result: Separators = { group: ',', decimal: '.' };
	try {
		const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
		result = {
			group: parts.find((p) => p.type === 'group')?.value ?? ',',
			decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.'
		};
	} catch {
		// An unknown locale tag: fall back to en conventions.
	}
	cache.set(locale, result);
	return result;
}

// Spaces that locales use as a group separator (fr, ru, ...) come in several code points.
const isSpace = (c: string) => c === ' ' || c === ' ' || c === ' ' || c === ' ';

export function parseLocaleNumber(raw: string, locale: string): number | null {
	const text = raw.trim();
	if (text === '' || text.length > MAX_LENGTH) return null;
	const { group, decimal } = separatorsFor(locale);
	let out = '';
	let sawDecimal = false;
	let sawDigit = false;
	for (let i = 0; i < text.length; i++) {
		const c = text.charAt(i);
		if (c >= '0' && c <= '9') {
			out += c;
			sawDigit = true;
		} else if (c === decimal) {
			if (sawDecimal) return null;
			sawDecimal = true;
			out += '.';
		} else if (c === group || (isSpace(c) && isSpace(group))) {
			// A group separator is only meaningful between digits.
			if (!sawDigit || sawDecimal) return null;
		} else if ((c === '-' || c === '+') && i === 0) {
			if (c === '-') out += '-';
		} else {
			return null;
		}
	}
	if (!sawDigit) return null;
	const n = Number(out);
	return Number.isFinite(n) ? n : null;
}
