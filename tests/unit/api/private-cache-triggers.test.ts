import { beforeEach, describe, expect, it, vi } from 'vitest';

const clearPrivateCaches = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const apiDelete = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const logoutRequest = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const goto = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('#lib/utils/private-caches.ts', () => ({
	clearPrivateCaches,
	IMPERSONATION_SESSION_KEY: 'leadkart-impersonation-session'
}));
vi.mock('$api/client', () => ({ api: { delete: apiDelete } }));
vi.mock('$api/csrf', () => ({ getCsrfToken: () => 'csrf' }));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: { data: {} } }));
vi.mock('$ui', () => ({ toast: { error: vi.fn() } }));
vi.mock('#lib/features/auth/api.ts', () => ({ logout: logoutRequest }));

import { AuthError, ScopeInvalidError, SESSION_EXPIRED_CODE } from '#lib/api/errors.ts';
import { exitOperatorScope } from '#lib/api/operator-scope.ts';
import {
	clearUserBrowserState,
	createQueryClient,
	renderQueryClient
} from '#lib/api/query-client.ts';
import { enterScope } from '#lib/features/operator/scope/api.ts';
import { session } from '#lib/features/auth/stores/session.svelte.ts';

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe('private cache clearing triggers', () => {
	it('session guard: an expired session (401) clears them', () => {
		vi.stubGlobal('location', { pathname: '/leads', search: '' });
		const expired = new AuthError(401);
		expired.code = SESSION_EXPIRED_CODE;
		createQueryClient()
			.getQueryCache()
			.config.onError?.(expired, { state: { data: undefined } } as never);
		expect(clearPrivateCaches).toHaveBeenCalledTimes(1);
	});

	it('session guard: scope_invalid clears them', async () => {
		vi.stubGlobal('location', { pathname: '/operator/scope/members', search: '' });
		createQueryClient()
			.getQueryCache()
			.config.onError?.(new ScopeInvalidError('expired'), { state: { data: undefined } } as never);
		await vi.waitFor(() => expect(clearPrivateCaches).toHaveBeenCalled());
	});

	it('scope exit clears them after the DELETE', async () => {
		await exitOperatorScope();
		expect(apiDelete).toHaveBeenCalledWith('/operator/scope');
		expect(clearPrivateCaches).toHaveBeenCalledTimes(1);
	});

	it('scope enter clears them after a successful POST, not after a failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
		);
		await enterScope({ slug: 'acme' });
		expect(clearPrivateCaches).toHaveBeenCalledTimes(1);

		clearPrivateCaches.mockClear();
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('{}', { status: 404 })))
		);
		await expect(enterScope({ slug: 'nope' })).rejects.toBeInstanceOf(Error);
		expect(clearPrivateCaches).not.toHaveBeenCalled();
	});

	it('logout clears them and leaves even when the request fails', async () => {
		const loc = { href: '/dashboard' };
		vi.stubGlobal('window', { location: loc });
		logoutRequest.mockRejectedValueOnce(new Error('offline'));
		await expect(session.logout()).rejects.toThrow('offline');
		expect(clearPrivateCaches).toHaveBeenCalledTimes(1);
		expect(loc.href).toBe('/signin');
	});

	it('logout clears them and redirects on success', async () => {
		const loc = { href: '/dashboard' };
		vi.stubGlobal('window', { location: loc });
		await session.logout();
		expect(clearPrivateCaches).toHaveBeenCalledTimes(1);
		expect(loc.href).toBe('/signin');
	});

	it('clearUserBrowserState drops the query cache, the impersonation marker and the caches', async () => {
		const client = renderQueryClient();
		client.setQueryData(['me', 'capabilities'], { email: 'previous@example.com' });
		window.localStorage.setItem('leadkart-impersonation-session', 'sess-1');
		await clearUserBrowserState();
		expect(client.getQueryData(['me', 'capabilities'])).toBeUndefined();
		expect(window.localStorage.getItem('leadkart-impersonation-session')).toBeNull();
		expect(clearPrivateCaches).toHaveBeenCalledTimes(1);
	});

	it('logout clears the browser query cache too', async () => {
		const client = renderQueryClient();
		client.setQueryData(['me', 'capabilities'], { email: 'previous@example.com' });
		vi.stubGlobal('window', { location: { href: '/dashboard' } });
		await session.logout();
		expect(client.getQueryData(['me', 'capabilities'])).toBeUndefined();
	});
});
