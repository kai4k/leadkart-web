/**
 * Nothing is sent while a hard reset is pending: code outside the children the (app) layout removes
 * (a toast's Undo) must not write under the NEW context's fingerprint with data meant for the old.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp-a' } } }));
vi.mock('#lib/api/capabilities-refresh.ts', () => ({ refreshCapabilities: vi.fn() }));

import { api } from '#lib/api/client.ts';
import { ScopeChangedError } from '#lib/api/errors.ts';
import { toast } from 'svelte-sonner';
import { hardReset, resetPending } from '#lib/api/hard-reset.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';

const fetchSpy = vi.fn(() => Promise.resolve(Response.json({ ok: true })));

beforeEach(() => {
	vi.useFakeTimers();
	sessionStorage.clear();
	resetBlock.clear();
	vi.stubGlobal('fetch', fetchSpy);
	vi.stubGlobal('location', { replace: vi.fn(), pathname: '/leads', search: '' });
	vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => {
	// a reset the test started is released like the browser does: by a new or restored document
	window.dispatchEvent(new Event('pageshow'));
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('resetPending', () => {
	it('is false on an ordinary page, and the client sends', async () => {
		expect(resetPending()).toBe(false);
		await expect(api.get('/v1/x', z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true });
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('is true while a reset is under way: every call method is refused before any network call', async () => {
		expect(hardReset('context')).toBe(true);
		expect(resetPending()).toBe(true);
		for (const call of [
			() => api.get('/v1/x', z.unknown()),
			() => api.post('/v1/x', {}),
			() => api.postJson('/v1/x', {}, z.unknown()),
			() => api.delete('/v1/x'),
			() => api.getBlob('/v1/x', 'text/csv'),
			() => api.postForm('/v1/x', new FormData(), z.unknown())
		]) {
			await expect(call()).rejects.toBeInstanceOf(ScopeChangedError);
		}
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('is NOT released by time: after 5 s and after 60 s it still refuses, and the stalled block is showing', async () => {
		expect(hardReset('context')).toBe(true);
		vi.advanceTimersByTime(5_000);
		expect(resetPending()).toBe(true);
		expect(resetBlock.kind).toBe('stalled');
		vi.advanceTimersByTime(55_000);
		expect(resetPending()).toBe(true);
		await expect(api.post('/v1/x', {})).rejects.toBeInstanceOf(ScopeChangedError);
		expect(fetchSpy).not.toHaveBeenCalled();
		// a second reset is swallowed too: the latch is still closed
		expect(hardReset('context')).toBe(false);
	});

	it('a new or restored document (pageshow) releases the latch; the block (children removed) stays until the page is replaced', async () => {
		hardReset('context');
		vi.advanceTimersByTime(5_000);
		window.dispatchEvent(new Event('pageshow'));
		expect(resetBlock.kind).toBe('stalled');
		expect(resetPending()).toBe(true); // the banner keeps the stale page from sending
		resetBlock.clear();
		expect(resetPending()).toBe(false);
		await api.get('/v1/x', z.unknown());
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('a reset released before the timeout does not show a stalled block later', () => {
		hardReset('context');
		window.dispatchEvent(new Event('pageshow'));
		vi.advanceTimersByTime(10_000);
		expect(resetBlock.kind).toBeNull();
	});

	it('starting a reset dismisses live toasts (an Undo from the old context must not stay on screen)', () => {
		const dismiss = vi.spyOn(toast, 'dismiss');
		hardReset('context');
		expect(dismiss).toHaveBeenCalledTimes(1);
	});

	it('stays true while a declined reset has its banner up (offline), and is released with the banner', async () => {
		vi.stubGlobal('navigator', { onLine: false });
		expect(hardReset('context')).toBe(false);
		expect(resetBlock.kind).toBe('offline');
		expect(resetPending()).toBe(true);
		await expect(api.post('/v1/x', {})).rejects.toBeInstanceOf(ScopeChangedError);
		expect(fetchSpy).not.toHaveBeenCalled();
		resetBlock.clear();
		expect(resetPending()).toBe(false);
	});
});
