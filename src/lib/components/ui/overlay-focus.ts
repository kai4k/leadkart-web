/**
 * Focus return for modal surfaces (Dialog, AlertDialog, Sheet, Popover content).
 *
 * bits-ui puts focus back on whatever was focused when the surface opened. Safari, and WebKit on every
 * platform, do not focus a `<button>` on a mouse click, so nothing was focused: on close focus stayed
 * on `<body>`, and a keyboard user lost their place. The control a person just clicked is the trigger
 * that APG wants focus back on, so this remembers the last clicked control (a keyboard Enter/Space on
 * a button is a click too) and returns focus to it on close when focus is not already on it and it is
 * not inside the opening surface (a control clicked inside a surface that is already open is the
 * invoker of a nested one; a focused button, a keyboard open, is left to bits-ui). A caller's own
 * `onOpenAutoFocus` / `onCloseAutoFocus` runs first and `preventDefault()` on it keeps the default out.
 */

/** A click older than this is not what opened the surface (a shortcut opens with no click). */
const RECENT_MS = 1000;

// `[tabindex="-1"]` is a programmatic focus target (`main#main-content`), never a control that opens something
const INVOKER =
	'button, a[href], summary, [role="button"], [role="menuitem"], [tabindex]:not([tabindex="-1"])';

let lastClick: { el: HTMLElement; at: number } | null = null;

if (typeof document !== 'undefined') {
	document.addEventListener(
		'click',
		(event) => {
			const target = event.target;
			const el = target instanceof Element ? target.closest<HTMLElement>(INVOKER) : null;
			lastClick = el ? { el, at: performance.now() } : null;
		},
		true
	);
}

type FocusHook = (event: Event) => void;

export type FocusReturn = {
	/** Pass as `onOpenAutoFocus`; remembers the invoker when nothing is focused. */
	open: (callerHandler?: FocusHook) => FocusHook;
	/** Pass as `onCloseAutoFocus`; returns focus to the remembered invoker. */
	close: (callerHandler?: FocusHook) => FocusHook;
};

export function createFocusReturn(): FocusReturn {
	let invoker: HTMLElement | null = null;
	return {
		open: (callerHandler) => (event) => {
			// the control that was just clicked, when focus is NOT on it (a button never takes focus on a mouse
			// click in WebKit, so focus is on the body, or, in a nested overlay, on a field of the surface below)
			// and it is not inside the surface that is opening
			const clicked =
				lastClick && performance.now() - lastClick.at < RECENT_MS ? lastClick.el : null;
			const surface = event.currentTarget ?? event.target;
			invoker =
				clicked &&
				clicked !== document.activeElement &&
				!(surface instanceof Node && surface.contains(clicked))
					? clicked
					: null;
			callerHandler?.(event);
		},
		close: (callerHandler) => (event) => {
			callerHandler?.(event);
			const target = invoker;
			invoker = null;
			if (event.defaultPrevented || !target?.isConnected) return;
			event.preventDefault();
			target.focus({ preventScroll: true });
		}
	};
}
