/**
 * Focus return for modal surfaces (Dialog, AlertDialog, Sheet, Popover content).
 *
 * bits-ui puts focus back on whatever was focused when the surface opened. Safari, and WebKit on every
 * platform, do not focus a `<button>` on a mouse click, so nothing was focused: on close focus stayed
 * on `<body>`, and a keyboard user lost their place. The control a person just clicked is the trigger
 * that APG wants focus back on, so this remembers the last clicked control (a keyboard Enter/Space on
 * a button is a click too) and, ONLY when bits-ui would have nothing to restore (focus was on the body
 * at open), returns focus to it on close. A caller's own `onOpenAutoFocus` / `onCloseAutoFocus` runs
 * first and `preventDefault()` on it keeps the surface's default out of the way.
 */

/** A click older than this is not what opened the surface (a shortcut opens with no click). */
const RECENT_MS = 1000;

const INVOKER = 'button, a[href], summary, [role="button"], [role="menuitem"], [tabindex]';

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
			const active = document.activeElement;
			const nothingFocused = !active || active === document.body;
			invoker =
				nothingFocused && lastClick && performance.now() - lastClick.at < RECENT_MS
					? lastClick.el
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
