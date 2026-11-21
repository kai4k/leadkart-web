/**
 * A page `<title>` that contains a name somebody else typed (a tenant, a person, a role). The browser
 * shows the title in a tab strip and a history list where a bidi override or another control character in it
 * would reorder the text around it. The Go API refuses these characters on write now; rows written before that
 * can still hold them, so every title built from stored data goes through here.
 */
/** C0 and C1 controls, zero-width and bidi marks, line and paragraph separators, bidi embeddings, overrides and isolates, the BOM */
function isUnsafe(code: number): boolean {
	return (
		code <= 0x1f ||
		(code >= 0x7f && code <= 0x9f) ||
		(code >= 0x200b && code <= 0x200f) ||
		code === 0x2028 ||
		code === 0x2029 ||
		(code >= 0x202a && code <= 0x202e) ||
		(code >= 0x2066 && code <= 0x2069) ||
		code === 0xfeff
	);
}

export function plainTitle(name: string | null | undefined): string {
	return [...(name ?? '')]
		.filter((ch) => !isUnsafe(ch.codePointAt(0) ?? 0))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
}
