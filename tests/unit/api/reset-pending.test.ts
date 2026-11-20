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
	// a reset the test started is released like the browser does (pageshow / timeout)
	vi.advanceTimersByTime(6_000);
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

	it('is released when the browser cancelled the reset (the timeout), and the client sends again', async () => {
		hardReset('context');
		vi.advanceTimersByTime(6_000);
		expect(resetPending()).toBe(false);
		await api.get('/v1/x', z.unknown());
		expect(fetchSpy).toHaveBeenCalledTimes(1);
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
