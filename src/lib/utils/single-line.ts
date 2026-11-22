/**
 * Go refuses line breaks, tabs and other control characters in a reason ("no field is multi-line",
 * internal/common/humantext). A reason field therefore behaves like a single-line input: Enter does not add a
 * line break, and pasted breaks and tabs become one space before anything is validated or sent.
 *
 * Only the line and tab characters are rewritten (CR, LF, VT, FF, TAB, NEL, U+2028, U+2029; a run is ONE space).
 * U+200C / U+200D (joiners inside Hindi and Persian words) are never touched.
 */
// U+2028 / U+2029 are built from code points: written literally inside a regex literal they end the line for the parser
const BREAKS = new RegExp(`[\\r\\n\\t\\v\\f\\x85${String.fromCharCode(0x2028, 0x2029)}]+`, 'g');

export const toSingleLine = (text: string): string => text.replace(BREAKS, ' ');
