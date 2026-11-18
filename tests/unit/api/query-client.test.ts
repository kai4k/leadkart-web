import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryObserver } from '@tanstack/svelte-query';

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
