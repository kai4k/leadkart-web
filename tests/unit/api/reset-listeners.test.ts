/**
 * The pending-change hook is observation only: a throwing listener must not keep the navigation from
 * being requested, must not leave the latch open or stuck, and must not stop the other listeners.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp-a' } } }));
vi.mock('#lib/api/capabilities-refresh.ts', () => ({ refreshCapabilities: vi.fn() }));

import { hardReset, onResetPendingChange, resetPending } from '#lib/api/hard-reset.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';

const replace = vi.fn();
beforeEach(() => {
	vi.useFakeTimers();
	sessionStorage.clear();
	resetBlock.clear();
	replace.mockClear();
	vi.stubGlobal('location', { replace, pathname: '/leads', search: '' });
	vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => {
	window.dispatchEvent(new Event('pageshow'));
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('a throwing pending-change listener', () => {
	it('does not stop the navigation, the latch, or the other listeners; the latch still opens on pageshow', () => {
		const order: string[] = [];
		const off1 = onResetPendingChange(() => {
			order.push('throws');
			throw new Error('boom');
		});
		const off2 = onResetPendingChange(() => order.push(resetPending() ? 'closed' : 'open'));
		expect(hardReset('scope')).toBe(true);
		// navigation was requested, the latch is closed, and the second listener still ran, after the replace
		expect(replace).toHaveBeenCalledTimes(1);
		expect(resetPending()).toBe(true);
		expect(order).toEqual(['throws', 'closed']);
		// pageshow releases the latch, listeners run again (the thrower again throws, isolated)
		window.dispatchEvent(new Event('pageshow'));
		expect(resetPending()).toBe(false);
		expect(order).toEqual(['throws', 'closed', 'throws', 'open']);
		off1();
		off2();
	});

	it('listeners run AFTER the navigation was requested', () => {
		const seen: boolean[] = [];
		const off = onResetPendingChange(() => seen.push(replace.mock.calls.length === 1));
		hardReset('scope');
		expect(seen[0]).toBe(true);
		off();
	});
});
