/**
 * `createBusyVeto` — the one bounded "can't dismiss while saving" rule, shared by Dialog and Drawer.
 *
 * A surface refuses to close while its save is in flight (`busy`), so the result lands where the
 * user can see it. Mutations have no client deadline by design (a committed write must never be
 * reported as timed out), so a stalled connection could hold the surface open for minutes with
 * every way out vetoed. After the client's read timeout of CONTINUOUS busy the veto is released:
 * the user can leave, and `dismiss()` says one neutral line (never "failed": the write may have
 * landed). The consumer's `onOpenChange(false)` then closes the surface and its reset-on-close
 * backstop (`useResetOnChange`) detaches the mutation, so a late result still toasts.
 *
 * A save that ends restarts the clock. Call during component initialisation (it owns an effect).
 */
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { DEFAULT_READ_TIMEOUT_MS } from '#lib/api/timeouts.ts';
import { toast } from '#lib/components/ui/sonner/index.ts';

export interface BusyVeto {
	/** True while dismissal must be refused: busy, and not yet busy for the full bound. */
	readonly holding: boolean;
	/** The user dismissed: when that happens past the bound, say the neutral line once. */
	dismiss: () => void;
}

export function createBusyVeto(isBusy: () => boolean, boundMs = DEFAULT_READ_TIMEOUT_MS): BusyVeto {
	let expired = $state(false);

	$effect(() => {
		if (!isBusy()) return;
		const id = setTimeout(() => (expired = true), boundMs);
		return () => {
			clearTimeout(id);
			expired = false;
		};
	});

	return {
		get holding() {
			return isBusy() && !expired;
		},
		dismiss() {
			if (isBusy() && expired) toast(get(_)('common.saveNotConfirmed'));
		}
	};
}
