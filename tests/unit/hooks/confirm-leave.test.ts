/**
 * `confirmLeave()`: the question a USER-started navigation made with `goto` (a row click, the user menu's Account item,
 * a command-palette hit) asks before it goes, because `beforeNavigate` ignores programmatic navigations on purpose.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardInRoot } from '../helpers/guard-root.svelte.ts';
import { confirmLeave, releaseLeaveGuards } from '#lib/hooks/use-leave-guard.svelte.ts';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));
const reset = vi.hoisted(() => ({ pending: false }));
vi.mock('#lib/api/hard-reset.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	resetPending: () => reset.pending
}));

let dispose: (() => void) | undefined;
function mountGuard(dirty: () => boolean) {
	dispose = guardInRoot(dirty);
}
afterEach(() => {
	dispose?.();
	dispose = undefined;
	reset.pending = false;
	releaseLeaveGuards(false);
	vi.restoreAllMocks();
});

describe('confirmLeave', () => {
	it('is true without asking when no guard is mounted or nothing is dirty', () => {
		const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
		expect(confirmLeave()).toBe(true);
		mountGuard(() => false);
		expect(confirmLeave()).toBe(true);
		expect(ask).not.toHaveBeenCalled();
	});

	it('asks when a guard has unsaved input, and the answer is the result', () => {
		const ask = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
		mountGuard(() => true);
		expect(confirmLeave()).toBe(false);
		expect(confirmLeave()).toBe(true);
		expect(ask).toHaveBeenCalledTimes(2);
	});

	it('never asks while a security reload is pending or after sign-out', () => {
		const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
		mountGuard(() => true);
		reset.pending = true;
		expect(confirmLeave()).toBe(true);
		reset.pending = false;
		releaseLeaveGuards(true);
		expect(confirmLeave()).toBe(true);
		expect(ask).not.toHaveBeenCalled();
	});

	it('a guard that is gone no longer counts', () => {
		const ask = vi.spyOn(window, 'confirm').mockReturnValue(false);
		mountGuard(() => true);
		dispose?.();
		dispose = undefined;
		expect(confirmLeave()).toBe(true);
		expect(ask).not.toHaveBeenCalled();
	});
});
