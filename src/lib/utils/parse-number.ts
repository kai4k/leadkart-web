/**
 * Parse a number the way a person in `locale` writes it: "1,00,000" (en-IN), "1,234.5" (en-US),
 * "1.234,5" (de), "१,२३,४५६" (hi, Devanagari digits). The group and decimal separators and the
 * grouping SIZES come from `Intl.NumberFormat`, so the product's own Indian grouping is read
 * correctly and a separator in the wrong place ("1,5" in en, "1,,2", "1,") is refused, never
 * silently read as another number.
 *
 * Returns `null` for anything that is not one plain number. Input longer than `MAX_LENGTH` is
 * refused before it is looked at, and the scan is a single pass with no regular expression.
 */
const MAX_LENGTH = 64;

type Format = {
	group: string;
	decimal: string;
	/** digits in the last group (3 in en, en-IN, de, hi) */
	primary: number;
	/** digits in every other group (2 in en-IN and hi, 3 elsewhere) */
	secondary: number;
};

const cache = new Map<string, Format>();

function formatFor(locale: string): Format {
	const hit = cache.get(locale);
	if (hit) return hit;
	let result: Format = { group: ',', decimal: '.', primary: 3, secondary: 3 };
	try {
		const parts = new Intl.NumberFormat(locale).formatToParts(123456789.5);
		const groups = parts.filter((p) => p.type === 'integer').map((p) => p.value.length);
		const primary = groups.at(-1) ?? 3;
		result = {
			group: parts.find((p) => p.type === 'group')?.value ?? ',',
			decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
			primary,
			secondary: groups.length > 2 ? (groups.at(-2) ?? primary) : primary
		};
	} catch {
		// An unknown locale tag: fall back to en conventions.
	}
	cache.set(locale, result);
	return result;
}

// Spaces that locales use as a group separator (fr, ru, ...) come in several code points.
// space, no-break space, narrow no-break space, thin space
const SPACES = [0x20, 0xa0, 0x202f, 0x2009].map((n) => String.fromCharCode(n));
const isSpace = (c: string) => SPACES.includes(c);

/** Code point of the digit zero of each decimal numbering system a user may type in. */
const ZEROS = [
	0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xff10
];

/** 0-9 for a decimal digit of any numbering system in `ZEROS`, else -1. */
function digitValue(c: string): number {
	const code = c.codePointAt(0) ?? -1;
	for (const zero of ZEROS) if (code >= zero && code <= zero + 9) return code - zero;
	return -1;
}

const isMinus = (c: string) => c === '-' || c === '−';

export function parseLocaleNumber(raw: string, locale: string): number | null {
	const text = raw.trim();
	if (text === '' || text.length > MAX_LENGTH) return null;
	const { group, decimal, primary, secondary } = formatFor(locale);
	let negative = false;
	let sawDecimal = false;
	let sawDigit = false;
	let fraction = '';
	// integer digits, as the groups the text wrote (a plain "1234" is one group)
	const groups: string[] = [''];
	for (let i = 0; i < text.length; i++) {
		const c = text.charAt(i);
		const d = digitValue(c);
		if (d >= 0) {
			sawDigit = true;
			if (sawDecimal) fraction += d;
			else groups[groups.length - 1] += d;
		} else if (c === decimal) {
			if (sawDecimal) return null;
			sawDecimal = true;
		} else if (c === group || (isSpace(c) && isSpace(group))) {
			// A group separator is only meaningful between digits, before the decimal.
			if (sawDecimal || groups[groups.length - 1] === '') return null;
			groups.push('');
		} else if ((isMinus(c) || c === '+') && i === 0) {
			negative = isMinus(c);
		} else {
			return null;
		}
	}
	if (!sawDigit) return null;
	if (groups.length > 1) {
		// the separators must sit where the locale puts them
		const last = groups[groups.length - 1];
		if (last.length !== primary) return null;
		for (let g = 1; g < groups.length - 1; g++) if (groups[g].length !== secondary) return null;
		const first = groups[0].length;
		if (first < 1 || first > Math.max(primary, secondary)) return null;
		if (secondary < primary && first > secondary) return null;
	}
	const n = Number(
		`${negative ? '-' : ''}${groups.join('') || '0'}${fraction ? `.${fraction}` : ''}`
	);
	return Number.isFinite(n) ? n : null;
}

/**
 * The text a number field shows after a commit: the locale's decimal separator, NO grouping, so a
 * decimal-comma locale re-parses its own output (`parseLocaleNumber(formatPlainNumber(n, l), l) === n`).
 */
export function formatPlainNumber(n: number, locale: string): string {
	try {
		return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(
			n
		);
	} catch {
		return String(n);
	}
}
