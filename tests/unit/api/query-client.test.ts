import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/svelte-query';

const goto = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const apiDelete = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$ui', () => ({ toast: { error: vi.fn() } }));
vi.mock('#lib/utils/private-caches.ts', () => ({
	clearPrivateCaches: vi.fn(),
	IMPERSONATION_SESSION_KEY: 'leadkart-impersonation-session'
}));
vi.mock('#lib/api/client.ts', () => ({ api: { delete: apiDelete } }));

import { ScopeInvalidError } from '#lib/api/errors.ts';
import { createQueryClient, renderQueryClient } from '#lib/api/query-client.ts';

beforeEach(() => vi.clearAllMocks());

describe('TanStack behaviour the scope guard depends on', () => {
	it('clear() leaves active observers stale; resetQueries() refetches them', async () => {
		const qc = new QueryClient();
		const queryFn = vi.fn(() => Promise.resolve(['tenant']));
		const observer = new QueryObserver(qc, { queryKey: ['tenants'], queryFn });
		const unsubscribe = observer.subscribe(() => {});
		await vi.waitFor(() => expect(observer.getCurrentResult().data).toEqual(['tenant']));
		expect(queryFn).toHaveBeenCalledTimes(1);

		qc.clear();
		await new Promise((r) => setTimeout(r, 20));
		expect(queryFn).toHaveBeenCalledTimes(1); // nothing refetched

		const qc2 = new QueryClient();
		const fn2 = vi.fn(() => Promise.resolve(['tenant']));
		const observer2 = new QueryObserver(qc2, { queryKey: ['tenants'], queryFn: fn2 });
		const unsubscribe2 = observer2.subscribe(() => {});
		await vi.waitFor(() => expect(fn2).toHaveBeenCalledTimes(1));
		await qc2.resetQueries();
		expect(fn2).toHaveBeenCalledTimes(2);
		expect(observer2.getCurrentResult().data).toEqual(['tenant']);

		unsubscribe();
		unsubscribe2();
	});
});

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
