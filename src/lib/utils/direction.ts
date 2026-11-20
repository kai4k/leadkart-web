/**
 * Physical side of the inline-end edge: `right` in LTR, `left` in RTL. For floating primitives
 * (bits-ui tooltip, popover) whose `side` is physical only. Reads the document's computed
 * direction when called, so call it where the floating content renders (client). The server and
 * tests without a document get LTR.
 */
export function inlineEndSide(root: Element | undefined = globalThis.document?.documentElement) {
	if (!root || typeof getComputedStyle !== 'function') return 'right';
	return getComputedStyle(root).direction === 'rtl' ? 'left' : 'right';
}
