/**
 * navigateHard's best-effort steps (clearing the query cache, dismissing toasts) cannot strand a reset: if one
 * throws, the latch is closed but the navigation is still requested, the release is armed (only `pageshow`
 * opens the latch again) and the stall timer runs. A hard navigation discards the in-memory cache anyway.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp-a' } } }));
vi.mock('#lib/api/capabilities-refresh.ts', () => ({ refreshCapabilities: vi.fn() }));
const toastMock = vi.hoisted(() => ({ dismiss: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: toastMock }));

import { hardReset, resetPending } from '#lib/api/hard-reset.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';

const replace = vi.fn();
beforeEach(() => {
	vi.useFakeTimers();
	sessionStorage.clear();
	resetBlock.clear();
	replace.mockClear();
	toastMock.dismiss.mockReset();
	vi.stubGlobal('location', { replace, pathname: '/leads', search: '' });
	vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => {
	window.dispatchEvent(new Event('pageshow'));
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('navigateHard: a failing best-effort step', () => {
	it('qc.clear() throws: the navigation is still requested, the latch is closed until pageshow, the stall timer runs', () => {
		const qc = {
			clear: vi.fn(() => {
				throw new Error('cache gone');
			})
		};
		expect(hardReset('scope', qc)).toBe(true);
		expect(qc.clear).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledTimes(1);
		expect(resetPending()).toBe(true);
		// the toast step still ran
		expect(toastMock.dismiss).toHaveBeenCalledTimes(1);
		// the stall path is armed: a navigation that never commits shows the block banner
		vi.advanceTimersByTime(60_000);
		expect(resetBlock.kind).toBe('stalled');
		window.dispatchEvent(new Event('pageshow'));
		expect(resetBlock.kind).toBe('stalled'); // the banner stays; the latch below is the pageshow's
		expect(resetPending()).toBe(true);
	});

	it('qc.clear() throws, no stall: only pageshow opens the latch again', () => {
		const qc = {
			clear: () => {
				throw new Error('x');
			}
		};
		expect(hardReset('scope', qc)).toBe(true);
		expect(resetPending()).toBe(true);
		window.dispatchEvent(new Event('pageshow'));
		expect(resetPending()).toBe(false);
	});

	it('toast.dismiss() throws: the navigation is still requested and the latch is closed until pageshow', () => {
		toastMock.dismiss.mockImplementation(() => {
			throw new Error('no toaster');
		});
		const qc = { clear: vi.fn() };
		expect(hardReset('scope', qc)).toBe(true);
		expect(qc.clear).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledTimes(1);
		expect(resetPending()).toBe(true);
		window.dispatchEvent(new Event('pageshow'));
		expect(resetPending()).toBe(false);
	});

	it('both throw: still one navigation, flag written, latch closed', () => {
		toastMock.dismiss.mockImplementation(() => {
			throw new Error('a');
		});
		expect(
			hardReset('scope', {
				clear: () => {
					throw new Error('b');
				}
			})
		).toBe(true);
		expect(replace).toHaveBeenCalledTimes(1);
		expect(sessionStorage.length).toBeGreaterThan(0);
		expect(resetPending()).toBe(true);
	});

	it('a second request while the latch is closed is declined (unchanged)', () => {
		expect(hardReset('scope')).toBe(true);
		expect(hardReset('scope')).toBe(false);
		expect(replace).toHaveBeenCalledTimes(1);
	});
});
