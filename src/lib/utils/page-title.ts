/**
 * A page `<title>` that contains a name somebody else typed (a tenant, a person, a role). The browser
 * shows the title in a tab strip and a history list where a bidi override or another control character in it
 * would reorder the text around it. The Go API refuses these characters on write now; rows written before that
 * can still hold them, so every title built from stored data goes through here.
 */
/**
 * The refused set of the Go backend (its docs/BFF_API_CHANGES.md), as [first, last] code point ranges:
 * C0 / DEL / C1 controls; U+00AD, U+034F, U+061C, U+115F, U+1160, U+180E; zero-width and bidi marks U+200B-U+200F
 * (the ZWNJ / ZWJ pair U+200C / U+200D is refused only at the edges of a word: see below); U+2028 / U+2029;
 * bidi embeddings, overrides and isolates U+202A-U+202E, U+2066-U+2069; invisible operators U+2060-U+2064;
 * deprecated format controls U+206A-U+206F; U+3164, U+FEFF, U+FFA0, U+FFF9-U+FFFC, and the tag block U+E0000-U+E007F.
 */
const UNSAFE: ReadonlyArray<readonly [number, number]> = [
	[0x0000, 0x001f],
	[0x007f, 0x009f],
	[0x00ad, 0x00ad],
	[0x034f, 0x034f],
	[0x061c, 0x061c],
	[0x115f, 0x1160],
	[0x180e, 0x180e],
	[0x200b, 0x200b],
	[0x200e, 0x200f],
	[0x2028, 0x2029],
	[0x202a, 0x202e],
	[0x2060, 0x2064],
	[0x2066, 0x2069],
	[0x206a, 0x206f],
	[0x3164, 0x3164],
	[0xfeff, 0xfeff],
	[0xffa0, 0xffa0],
	[0xfff9, 0xfffc],
	[0xe0000, 0xe007f]
];
/** ZWNJ and ZWJ shape Persian, Indic and emoji text: allowed INSIDE a word, never at its edges or next to a space */
const JOINERS = new Set([0x200c, 0x200d]);

export function isUnsafeCodePoint(code: number): boolean {
	return UNSAFE.some(([lo, hi]) => code >= lo && code <= hi);
}

export function plainTitle(name: string | null | undefined): string {
	const chars = [...(name ?? '')].filter((ch) => !isUnsafeCodePoint(ch.codePointAt(0) ?? 0));
	// a joiner survives only between two non-space, non-joiner characters
	const kept = chars.filter((ch, i) => {
		if (!JOINERS.has(ch.codePointAt(0) ?? 0)) return true;
		const prev = chars[i - 1];
		const next = chars[i + 1];
		return (
			prev !== undefined &&
			next !== undefined &&
			!/\s/.test(prev) &&
			!/\s/.test(next) &&
			!JOINERS.has(prev.codePointAt(0) ?? 0) &&
			!JOINERS.has(next.codePointAt(0) ?? 0)
		);
	});
	return kept.join('').replace(/\s+/g, ' ').trim();
}
