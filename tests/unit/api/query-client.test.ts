import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver } from '@tanstack/svelte-query';

const goto = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const apiDelete = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('$app/navigation', () => ({ goto, invalidate: vi.fn(() => Promise.resolve()) }));
vi.mock('$ui', () => ({ toast: { error: vi.fn() } }));
vi.mock('#lib/api/client.ts', () => ({ api: { delete: apiDelete } }));

import { NetworkError, ScopeInvalidError, TimeoutError } from '#lib/api/errors.ts';
import { createQueryClient, renderQueryClient } from '#lib/api/query-client.ts';

beforeEach(() => vi.clearAllMocks());

describe('scope guard wiring: operator already on /operator/tenants', () => {
	it('refetches the tenants list after the scope exit, before navigating', async () => {
		vi.stubGlobal('location', { pathname: '/operator/tenants', search: '' });
		let scoped = true;
		const queryFn = vi.fn(() =>
			scoped ? Promise.reject(new ScopeInvalidError('expired')) : Promise.resolve(['acme'])
		);
		apiDelete.mockImplementation(() => {
			scoped = false;
			return Promise.resolve();
		});

		const observer = new QueryObserver(createQueryClient(), {
			queryKey: ['operator', 'tenants'],
			queryFn,
			retry: false
		});
		const unsubscribe = observer.subscribe(() => {});

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/operator/tenants'));
		await vi.waitFor(() => expect(observer.getCurrentResult().data).toEqual(['acme']));
		expect(apiDelete).toHaveBeenCalledTimes(1);
		unsubscribe();
		vi.unstubAllGlobals();
	});
});

describe('renderQueryClient', () => {
	it('returns the one tab-wide client in the browser', () => {
		expect(renderQueryClient()).toBe(renderQueryClient());
	});

	it('createQueryClient builds an independent cache each call', () => {
		const a = createQueryClient();
		const b = createQueryClient();
		a.setQueryData(['me', 'capabilities'], { email: 'a@example.com' });
		expect(b.getQueryData(['me', 'capabilities'])).toBeUndefined();
	});
});

describe('retry policy', () => {
	const retry = () => {
		const r = createQueryClient().getDefaultOptions().queries?.retry;
		if (typeof r !== 'function') throw new Error('retry must be a function');
		return r;
	};
	it('retries a TimeoutError once for queries', () => {
		expect(retry()(0, new TimeoutError())).toBe(true);
		expect(retry()(1, new TimeoutError())).toBe(false);
	});
	it('still retries network faults twice and never retries 4xx', () => {
		expect(retry()(1, new NetworkError(new TypeError('x')))).toBe(true);
		expect(retry()(2, new NetworkError(new TypeError('x')))).toBe(false);
		expect(retry()(0, new ScopeInvalidError('x'))).toBe(false);
	});
	it('never retries mutations', () => {
		expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
	});
});
