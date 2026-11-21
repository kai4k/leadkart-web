import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';

type Nav = { cancel: () => void; type: string; willUnload: boolean };
const h = vi.hoisted(() => ({ callback: undefined as ((nav: Nav) => void) | undefined }));
vi.mock('$app/navigation', () => ({
	beforeNavigate: (cb: (nav: Nav) => void) => {
		h.callback = cb;
	}
}));

import { inRoot } from './root.svelte.ts';
import { navigateHard, resetPending } from '#lib/api/hard-reset.ts';
import { useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';

/**
 * The REAL hard reset (no mock of `#lib/api/hard-reset.ts`): once `navigateHard` has started the reload the page
 * is stale and must go, so a dirty form's guard neither asks nor cancels nor prompts.
 */
describe('a dirty leave guard against the real hard reset', () => {
	let dispose: () => void;
	afterEach(() => {
		dispose?.();
		window.dispatchEvent(new Event('pageshow')); // releases the latch
	});

	it('before the reset the dirty guard prompts; after navigateHard it does not', () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		dispose = inRoot(() => useLeaveGuard(() => true)).dispose;
		flushSync();

		const before = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(before);
		expect(before.defaultPrevented).toBe(true);

		expect(navigateHard('/', 'context')).toBe(true);
		expect(resetPending()).toBe(true);

		const after = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(after);
		expect(after.defaultPrevented).toBe(false);

		const n = { cancel: vi.fn(), type: 'goto', willUnload: false };
		h.callback!(n);
		expect(n.cancel).not.toHaveBeenCalled();
		expect(confirmSpy).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});
});
