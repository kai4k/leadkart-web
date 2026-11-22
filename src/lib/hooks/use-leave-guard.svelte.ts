/**
 * `useLeaveGuard` — a form with unsaved input asks before the user walks away from it.
 *
 *   useLeaveGuard(() => open && form.dirty);          // call during component initialisation
 *
 * In-app navigation (`beforeNavigate`), only when the USER started it (`navigation.type` `link` / `popstate`):
 * `confirm(message)`; declining cancels the navigation. Never a programmatic `goto`, never a target in `(auth)`. A page UNLOAD
 * (closing the tab, a reload, an external link) cannot show a `confirm()`, so it is left to the browser's own
 * prompt, which `beforeunload` + `preventDefault()` asks for.
 *
 * What it never does:
 *   - Get in the way of the security reload. `hardReset` / `navigateHard` (`#lib/api/hard-reset.ts`) leave a page
 *     whose company, account or session moved under it; keeping that page open for a prompt would keep a stale
 *     context on screen. `resetPending()` is read AT THE TIME OF EACH EVENT (the reset starts after the guard
 *     was installed), and while it is true the guard is silent.
 *   - Block signing out. `session.logout()` calls `releaseLeaveGuards()` before it navigates: the user chose to
 *     leave, and everything user-specific is dropped anyway.
 */
import { beforeNavigate } from '$app/navigation';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { resetPending } from '#lib/api/hard-reset.ts';

// Plain module flag, not reactive state: it is only ever set in the browser, by the sign-out the user chose.
let released = false;

/** The page is being left on purpose (sign-out): no guard asks anything from now on. */
export function releaseLeaveGuards(on = true): void {
	released = on;
}

/** True while no guard may ask anything: a sign-out was chosen, or a security reload is under way / done. */
export const guardsSilent = (): boolean => released || resetPending();
const silent = guardsSilent;

// every mounted guard's dirty check: `confirmLeave` asks when ANY says there is unsaved input
let guards: (() => boolean)[] = [];

/**
 * Ask before a navigation the USER started that is made with `goto` (a list row, a kanban card, a back button; menu and command items are real links instead):
 * `beforeNavigate` ignores programmatic navigations on purpose (the session guard, scope changes, filter URL updates
 * must never be questioned), so such a handler calls this first and goes only when it resolves true. True at once when
 * nothing is dirty; always true while a security reload is pending or after sign-out. A real `<a href>` needs none of
 * this: the guard sees it as a `link` navigation.
 */
export function confirmLeave(message?: string): boolean {
	if (guardsSilent()) return true;
	if (!guards.some((dirty) => dirty())) return true;
	// eslint-disable-next-line no-alert -- the platform's own blocking question is the contract of a leave guard
	return confirm(message ?? get(_)('form.leaveGuard'));
}

export function useLeaveGuard(isDirty: () => boolean, message?: string): void {
	$effect(() => {
		guards = [...guards, isDirty];
		return () => {
			guards = guards.filter((g) => g !== isDirty);
		};
	});
	beforeNavigate((navigation) => {
		if (silent() || !isDirty()) return;
		// the page is unloading: confirm() is not allowed there, the beforeunload prompt below speaks for it
		if (navigation.willUnload) return;
		// Only what the USER started is questioned: a link, Back / Forward. Code that navigates (the session guard's
		// redirect to /signin, scope changes, filter and pagination URL updates, a save's redirect) is never asked
		// about and never cancelled, and neither is any navigation into the (auth) group.
		if (navigation.type !== 'link' && navigation.type !== 'popstate') return;
		if (navigation.to?.route.id?.startsWith('/(auth)')) return;
		// eslint-disable-next-line no-alert -- the platform's own blocking question is the contract of a leave guard
		if (!confirm(message ?? get(_)('form.leaveGuard'))) navigation.cancel();
	});

	// Registered ONLY while there is unsaved input and removed as soon as the form is clean: a permanent
	// `beforeunload` listener takes the page out of Firefox's back/forward cache. `isDirty()` is read inside the
	// effect, so a reactive dirty flag adds and removes the listener; the handler still checks at the time of the event.
	$effect(() => {
		if (!isDirty()) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (silent() || !isDirty()) return;
			e.preventDefault();
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	});
}
