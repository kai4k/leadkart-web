import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiDelete = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const apiPost = vi.hoisted(() => vi.fn((_path: string, _body?: unknown) => Promise.resolve()));
const logoutRequest = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const goto = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('$api/client', () => ({ api: { delete: apiDelete, post: apiPost } }));
vi.mock('$api/csrf', () => ({ getCsrfToken: () => 'csrf' }));
vi.mock('$app/navigation', () => ({ goto, invalidate: vi.fn(() => Promise.resolve()) }));
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

describe('browser state clearing triggers (the worker stores nothing private: no cache to drop)', () => {
	it('session guard: an expired session (401) clears the browser state', () => {
		vi.stubGlobal('location', { pathname: '/leads', search: '' });
		const expired = new AuthError(401);
		expired.code = SESSION_EXPIRED_CODE;
		createQueryClient()
			.getQueryCache()
			.config.onError?.(expired, { state: { data: undefined } } as never);
		expect(window.localStorage.getItem('leadkart-impersonation-session')).toBeNull();
	});

	it('session guard: scope_invalid exits the scope', async () => {
		vi.stubGlobal('location', { pathname: '/operator/scope/members', search: '' });
		createQueryClient()
			.getQueryCache()
			.config.onError?.(new ScopeInvalidError('expired'), { state: { data: undefined } } as never);
		await vi.waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/operator/scope'));
	});

	it('scope exit is one DELETE through the API client', async () => {
		await exitOperatorScope();
		expect(apiDelete).toHaveBeenCalledWith('/operator/scope');
	});

	it('scope enter goes through the one API client and surfaces a failure', async () => {
		await enterScope({ slug: 'acme' });
		expect(apiPost).toHaveBeenCalledWith('/operator/scope', { slug: 'acme' });
		apiPost.mockRejectedValueOnce(new Error('not found'));
		await expect(enterScope({ slug: 'nope' })).rejects.toBeInstanceOf(Error);
	});

	it('logout leaves even when the request fails', async () => {
		const loc = { href: '/dashboard' };
		vi.stubGlobal('window', { location: loc });
		logoutRequest.mockRejectedValueOnce(new Error('offline'));
		await expect(session.logout()).rejects.toThrow('offline');
		expect(loc.href).toBe('/signin');
	});

	it('logout redirects on success', async () => {
		const loc = { href: '/dashboard' };
		vi.stubGlobal('window', { location: loc });
		await session.logout();
		expect(loc.href).toBe('/signin');
	});

	it('clearUserBrowserState drops the query cache and the impersonation marker', () => {
		const client = renderQueryClient();
		client.setQueryData(['me', 'capabilities'], { email: 'previous@example.com' });
		window.localStorage.setItem('leadkart-impersonation-session', 'sess-1');
		clearUserBrowserState();
		expect(client.getQueryData(['me', 'capabilities'])).toBeUndefined();
		expect(window.localStorage.getItem('leadkart-impersonation-session')).toBeNull();
	});

	it('logout clears the browser query cache too', async () => {
		const client = renderQueryClient();
		client.setQueryData(['me', 'capabilities'], { email: 'previous@example.com' });
		vi.stubGlobal('window', { location: { href: '/dashboard' } });
		await session.logout();
		expect(client.getQueryData(['me', 'capabilities'])).toBeUndefined();
	});
});
