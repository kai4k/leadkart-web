/**
 * Downloads through the API client: the Blob carries the type the CALLER expects (never the
 * response's), the deadline bounds the headers and not the body, and the CSV export saves through
 * the one download helper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const downloaded = vi.hoisted(() => vi.fn());
vi.mock('#lib/utils/download.ts', () => ({ CSV_TYPE: 'text/csv', downloadBlob: downloaded }));

import {
	api,
	DEFAULT_TIMEOUT_MS,
	DOWNLOAD_MAX_BYTES,
	DOWNLOAD_MAX_DURATION_MS
} from '#lib/api/client.ts';
import { DownloadTooLargeError, DownloadTooLongError, TimeoutError } from '#lib/api/errors.ts';
import { exportLeads } from '#lib/features/leads/api.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

const answer = (type: string, body = 'a,b\n1,2') =>
	Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': type } }));

describe('api.getBlob', () => {
	it.each(['text/html', 'application/javascript', 'image/svg+xml', 'text/csv'])(
		"a response typed %s is handed back as the caller's type",
		async (served) => {
			vi.stubGlobal('fetch', () => answer(served));
			const blob = await api.getBlob('/v1/x/export', 'text/csv');
			expect(blob.type).toBe('text/csv');
			expect(await blob.text()).toBe('a,b\n1,2');
		}
	);

	it('the deadline bounds the headers: a body that keeps streaming past the read budget still arrives', async () => {
		const enc = new TextEncoder();
		let controller!: ReadableStreamDefaultController<Uint8Array>;
		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				controller = c;
			}
		});
		vi.stubGlobal('fetch', () =>
			Promise.resolve(new Response(stream, { headers: { 'content-type': 'text/csv' } }))
		);
		const p = api.getBlob('/v1/x/export', 'text/csv');
		// A chunk every 20 s for far longer than the read budget: never idle for 30 s.
		for (let i = 0; i < 6; i++) {
			await vi.advanceTimersByTimeAsync(20_000);
			controller.enqueue(enc.encode(`row${i},`));
		}
		expect(6 * 20_000).toBeGreaterThan(DEFAULT_TIMEOUT_MS * 3);
		controller.close();
		expect(await (await p).text()).toBe('row0,row1,row2,row3,row4,row5,');
	});

	it('the headers are still bounded: no answer within the read budget is a TimeoutError', async () => {
		vi.stubGlobal(
			'fetch',
			(_u: string, init?: RequestInit) =>
				new Promise<Response>((_res, rej) =>
					init?.signal?.addEventListener('abort', () => rej(init.signal!.reason), { once: true })
				)
		);
		const p = api.getBlob('/v1/x/export', 'text/csv').catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
		expect(await p).toBeInstanceOf(TimeoutError);
	});
});

describe('api.getBlob: a stalled body', () => {
	const enc = new TextEncoder();
	/** A response whose body sends `first`, then nothing until the test closes it. */
	function stalled(first: string, status = 200) {
		let controller!: ReadableStreamDefaultController<Uint8Array>;
		let cancelled: unknown;
		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				controller = c;
				if (first) c.enqueue(enc.encode(first));
			},
			cancel(reason) {
				cancelled = reason ?? 'cancelled';
			}
		});
		return {
			response: new Response(stream, { status, headers: { 'content-type': 'text/csv' } }),
			wasCancelled: () => cancelled !== undefined,
			controller: () => controller
		};
	}

	it('no chunk for 30 s aborts the download: a TimeoutError, and the stream is cancelled', async () => {
		const s = stalled('a,b');
		vi.stubGlobal('fetch', () => Promise.resolve(s.response));
		const p = api.getBlob('/v1/x/export', 'text/csv').catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(29_000);
		expect(s.wasCancelled()).toBe(false);
		await vi.advanceTimersByTimeAsync(1_500);
		expect(await p).toBeInstanceOf(TimeoutError);
		expect(s.wasCancelled()).toBe(true);
	});

	it('a caller signal aborts a download whose body is stalled', async () => {
		const s = stalled('a,b');
		vi.stubGlobal('fetch', () => Promise.resolve(s.response));
		const ctrl = new AbortController();
		const p = api
			.getBlob('/v1/x/export', 'text/csv', { signal: ctrl.signal })
			.catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(5_000);
		ctrl.abort(new DOMException('navigated away', 'AbortError'));
		const err = await p;
		expect((err as DOMException).name).toBe('AbortError');
		expect(s.wasCancelled()).toBe(true);
	});

	it('an error body is read under the normal deadline, not left open for ever', async () => {
		const s = stalled('{"error":"for', 403);
		vi.stubGlobal('fetch', () => Promise.resolve(s.response));
		const p = api.getBlob('/v1/x/export', 'text/csv').catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1_000);
		expect(await p).toBeInstanceOf(TimeoutError);
	});
});

describe('api.getBlob: caps on the whole body', () => {
	const enc = new TextEncoder();
	/** A body that sends `chunk` every `everyMs`, for ever, and records that it was cancelled. */
	function dripping(everyMs: number, chunk: string) {
		let cancelled = false;
		let timer: ReturnType<typeof setInterval> | undefined;
		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				timer = setInterval(() => c.enqueue(enc.encode(chunk)), everyMs);
			},
			cancel() {
				cancelled = true;
				clearInterval(timer);
			}
		});
		return {
			response: new Response(stream, { headers: { 'content-type': 'text/csv' } }),
			wasCancelled: () => cancelled,
			stop: () => clearInterval(timer)
		};
	}

	it('defaults: 10 minutes and 100 MB', () => {
		expect(DOWNLOAD_MAX_DURATION_MS).toBe(10 * 60_000);
		expect(DOWNLOAD_MAX_BYTES).toBe(100 * 1024 * 1024);
	});

	it('a body that drips for ever (never idle for 30 s) is stopped at 10 minutes: DownloadTooLongError, stream cancelled', async () => {
		const d = dripping(20_000, 'x');
		vi.stubGlobal('fetch', () => Promise.resolve(d.response));
		const p = api.getBlob('/v1/x/export', 'text/csv').catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(DOWNLOAD_MAX_DURATION_MS - 1_000);
		expect(d.wasCancelled()).toBe(false);
		await vi.advanceTimersByTimeAsync(2_000);
		const err = await p;
		expect(err).toBeInstanceOf(DownloadTooLongError);
		expect((err as Error).name).toBe('DownloadTooLongError');
		expect(err).not.toBeInstanceOf(TimeoutError);
		expect(d.wasCancelled()).toBe(true);
		d.stop();
	});

	it('the duration cap is overridable by the caller (shorter, and none)', async () => {
		const short = dripping(1_000, 'x');
		vi.stubGlobal('fetch', () => Promise.resolve(short.response));
		const p = api
			.getBlob('/v1/x/export', 'text/csv', { maxDownloadMs: 5_000 })
			.catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(5_500);
		expect(await p).toBeInstanceOf(DownloadTooLongError);
		short.stop();

		const enc2 = new TextEncoder();
		let controller!: ReadableStreamDefaultController<Uint8Array>;
		const body = new ReadableStream<Uint8Array>({
			start(c) {
				controller = c;
			}
		});
		vi.stubGlobal('fetch', () => Promise.resolve(new Response(body)));
		const q = api.getBlob('/v1/x/export', 'text/csv', { maxDownloadMs: Infinity });
		for (let i = 0; i < 40; i++) {
			await vi.advanceTimersByTimeAsync(20_000); // 800 s: past the default cap
			controller.enqueue(enc2.encode('r'));
		}
		controller.close();
		expect((await q).size).toBe(40);
	});

	it('a body past the byte cap is stopped: DownloadTooLargeError (a different name), stream cancelled', async () => {
		const d = dripping(1_000, 'abcdef');
		vi.stubGlobal('fetch', () => Promise.resolve(d.response));
		const p = api
			.getBlob('/v1/x/export', 'text/csv', { maxDownloadBytes: 10 })
			.catch((e: unknown) => e);
		await vi.advanceTimersByTimeAsync(3_000); // 18 bytes
		const err = await p;
		expect(err).toBeInstanceOf(DownloadTooLargeError);
		expect((err as Error).name).toBe('DownloadTooLargeError');
		expect(err).not.toBeInstanceOf(DownloadTooLongError);
		expect(d.wasCancelled()).toBe(true);
		d.stop();
	});

	it('a body exactly at the byte cap still arrives', async () => {
		vi.stubGlobal('fetch', () => answer('text/csv', '0123456789'));
		const blob = await api.getBlob('/v1/x/export', 'text/csv', { maxDownloadBytes: 10 });
		expect(blob.size).toBe(10);
	});
});

describe('the CSV exports', () => {
	it('exportLeads downloads leads.csv through the one helper, typed text/csv', async () => {
		vi.stubGlobal('fetch', () => answer('text/html'));
		await exportLeads({ q: 'asha' });
		expect(downloaded).toHaveBeenCalledTimes(1);
		const [blob, name] = downloaded.mock.calls[0] as [Blob, string];
		expect([blob.type, name]).toEqual(['text/csv', 'leads.csv']);
	});

	it('exportLeads re-types an octet-stream answer as text/csv', async () => {
		vi.stubGlobal('fetch', () => answer('application/octet-stream'));
		await exportLeads();
		const [blob, name] = downloaded.mock.calls[0] as [Blob, string];
		expect([blob.type, name]).toEqual(['text/csv', 'leads.csv']);
	});

	it('a failed export downloads nothing', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 403 })));
		await expect(exportLeads()).rejects.toBeDefined();
		expect(downloaded).not.toHaveBeenCalled();
	});
});
