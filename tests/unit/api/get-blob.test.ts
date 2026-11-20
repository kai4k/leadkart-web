/**
 * Downloads through the API client: the Blob carries the type the CALLER expects (never the
 * response's), the deadline bounds the headers and not the body, and both CSV exports save through
 * the one download helper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const downloaded = vi.hoisted(() => vi.fn());
vi.mock('#lib/utils/download.ts', () => ({ CSV_TYPE: 'text/csv', downloadBlob: downloaded }));

import { api, DEFAULT_TIMEOUT_MS } from '#lib/api/client.ts';
import { TimeoutError } from '#lib/api/errors.ts';
import { exportLeads } from '#lib/features/leads/api.ts';
import { exportProducts } from '#lib/features/inventory/api.ts';

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

	it('the deadline bounds the headers: a body that streams past the read budget still arrives', async () => {
		let release!: () => void;
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				release = () => {
					controller.enqueue(new TextEncoder().encode('late,rows'));
					controller.close();
				};
			}
		});
		vi.stubGlobal('fetch', () =>
			Promise.resolve(new Response(stream, { headers: { 'content-type': 'text/csv' } }))
		);
		const p = api.getBlob('/v1/x/export', 'text/csv');
		await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS * 3);
		release();
		expect(await (await p).text()).toBe('late,rows');
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

describe('the CSV exports', () => {
	it('exportLeads downloads leads.csv through the one helper, typed text/csv', async () => {
		vi.stubGlobal('fetch', () => answer('text/html'));
		await exportLeads({ q: 'asha' });
		expect(downloaded).toHaveBeenCalledTimes(1);
		const [blob, name] = downloaded.mock.calls[0] as [Blob, string];
		expect([blob.type, name]).toEqual(['text/csv', 'leads.csv']);
	});

	it('exportProducts downloads products.csv through the same helper', async () => {
		vi.stubGlobal('fetch', () => answer('application/octet-stream'));
		await exportProducts();
		const [blob, name] = downloaded.mock.calls[0] as [Blob, string];
		expect([blob.type, name]).toEqual(['text/csv', 'products.csv']);
	});

	it('a failed export downloads nothing', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response('{}', { status: 403 })));
		await expect(exportLeads()).rejects.toBeDefined();
		expect(downloaded).not.toHaveBeenCalled();
	});
});
