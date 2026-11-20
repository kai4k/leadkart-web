import { describe, expect, it, vi } from 'vitest';
import { SCOPE_CHANGED_MESSAGE, SCOPE_EXPIRED_MESSAGE } from '#lib/api/scope-header.ts';
import { createSessionGuard } from '#lib/api/session-guard.ts';
import {
	ApiError,
	AuthError,
	ConflictError,
	ScopeChangedError,
	ScopeInvalidError,
	ServerError,
	SESSION_EXPIRED_CODE
} from '#lib/api/errors.ts';

function setup(location = { pathname: '/leads', search: '?page=2' }) {
	const deps = {
		goto: vi.fn((url: string) => {
			location.pathname = url.split('?')[0];
			location.search = '';
		}),
		clearCache: vi.fn(),
		notify: vi.fn(),
		exitScope: vi.fn(() => Promise.resolve()),
		followContext: vi.fn(() => Promise.resolve()),
		location: () => location
	};
	return { deps, guard: createSessionGuard(deps) };
}

/** The BFF's tagged 401: the session really ended. */
function expired(): AuthError {
	const err = new AuthError(401);
	err.code = SESSION_EXPIRED_CODE;
	return err;
}

describe('session guard — 401', () => {
	it('clears the cache and sends the user to /signin with next, once', () => {
		const { deps, guard } = setup();
		expect(guard.handle(expired())).toBe(true);
		expect(guard.handle(expired())).toBe(true);
		expect(deps.clearCache).toHaveBeenCalledTimes(1);
		expect(deps.goto).toHaveBeenCalledTimes(1);
		expect(deps.goto).toHaveBeenCalledWith(`/signin?next=${encodeURIComponent('/leads?page=2')}`);
	});

	it('an untagged 401 (a failed credential check) does not sign the user out', () => {
		const { deps, guard } = setup();
		const err = new AuthError(401);
		err.code = 'incorrect_current_password';
		expect(guard.handle(err)).toBe(false);
		expect(guard.handle(new AuthError(401))).toBe(false);
		expect(deps.goto).not.toHaveBeenCalled();
		expect(deps.clearCache).not.toHaveBeenCalled();
	});

	it('ignores 403 and unrelated errors', () => {
		const { deps, guard } = setup();
		expect(guard.handle(new AuthError(403))).toBe(false);
		expect(guard.handle(new ServerError(500, null))).toBe(false);
		expect(guard.handle(new Error('x'))).toBe(false);
		expect(deps.goto).not.toHaveBeenCalled();
	});

	it('does nothing on /signin itself (but still reports handled)', () => {
		const { deps, guard } = setup({ pathname: '/signin', search: '' });
		expect(guard.handle(expired())).toBe(true);
		expect(deps.goto).not.toHaveBeenCalled();
	});

	it('ordinary 409 conflicts are not handled', () => {
		const { guard } = setup();
		expect(guard.handle(new ConflictError('dup'))).toBe(false);
	});
});

describe('session guard — scope codes', () => {
	const res = (status: number) => new Response(null, { status });
	it.each([
		['tenant_scope_not_supported', 403],
		['tenant_scope_read_only', 403],
		['tenant_scope_forbidden', 403],
		['tenant_scope_conflict', 400],
		['tenant_not_active', 409]
	])('%s (%i) from Go does not leave the scope', (code, status) => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		expect(guard.handle(ApiError.fromResponse(res(status), { error: code }))).toBe(false);
		expect(deps.exitScope).not.toHaveBeenCalled();
		expect(deps.notify).not.toHaveBeenCalled();
		expect(deps.goto).not.toHaveBeenCalled();
	});
	it.each([
		['invalid_tenant_scope', 400],
		['tenant_scope_not_found', 404]
	])('%s (%i) still exits the scope', async (code, status) => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		expect(guard.handle(ApiError.fromResponse(res(status), { error: code }))).toBe(true);
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledWith('/operator/tenants'));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
	});
});

describe('session guard — scope_invalid', () => {
	const scopeError = () => new ScopeInvalidError('expired');

	it('exits scope (cookie, cache and layout in the right order, inside exitScope), toasts, then goes to /operator/tenants — once', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		expect(guard.handle(scopeError())).toBe(true);
		expect(guard.handle(scopeError())).toBe(true);
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledTimes(1));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
		expect(deps.clearCache).not.toHaveBeenCalled();
		expect(deps.notify).toHaveBeenCalledTimes(1);
		expect(deps.notify).toHaveBeenCalledWith(SCOPE_EXPIRED_MESSAGE);
		expect(deps.goto).toHaveBeenCalledWith('/operator/tenants');
		// The exit (which follows the change and resets the cache) finishes before the navigation.
		expect(deps.exitScope.mock.invocationCallOrder[0]).toBeLessThan(
			deps.goto.mock.invocationCallOrder[0]
		);
	});

	it('exit fails: one toast, one navigation to /signin, no second DELETE on a later 409', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		deps.exitScope.mockRejectedValue(new Error('offline'));
		guard.handle(scopeError());
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledTimes(1));
		expect(deps.goto).toHaveBeenCalledWith('/signin');
		expect(deps.notify).toHaveBeenCalledTimes(1);
		expect(deps.notify).toHaveBeenCalledWith('Could not leave the tenant context — signing out');
		expect(deps.clearCache).toHaveBeenCalledTimes(1);

		// Navigation settled, user is on /signin; a straggling 409 must not re-arm.
		await Promise.resolve();
		await Promise.resolve();
		expect(guard.handle(scopeError())).toBe(true);
		await Promise.resolve();
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
		expect(deps.goto).toHaveBeenCalledTimes(1);
		expect(deps.notify).toHaveBeenCalledTimes(1);
	});

	it('can fire again after the redirect settled', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/profile', search: '' });
		guard.handle(scopeError());
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledTimes(1));
		await Promise.resolve();
		await Promise.resolve();
		guard.handle(scopeError());
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledTimes(2));
	});
});

describe('session guard: scope errors regardless of HTTP status', () => {
	it('handles a ScopeInvalidError that arrived as 404 tenant_scope_not_found', async () => {
		const deps = {
			goto: vi.fn(() => Promise.resolve()),
			clearCache: vi.fn(),
			notify: vi.fn(),
			exitScope: vi.fn(() => Promise.resolve()),
			followContext: vi.fn(() => Promise.resolve()),
			location: () => ({ pathname: '/operator/scope/members', search: '' })
		};
		const guard = createSessionGuard(deps);
		const err = ApiError.fromResponse(new Response(null, { status: 404 }), {
			error: 'tenant_scope_not_found'
		});
		expect(guard.handle(err)).toBe(true);
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledWith('/operator/tenants'));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
	});
});

describe('session guard — scope_changed (another tab changed the context)', () => {
	const changed = () => new ScopeChangedError('x');

	it('tells the user, re-runs the layout once, and does not navigate by itself', async () => {
		const { deps, guard } = setup({ pathname: '/settings/users', search: '' });
		expect(guard.handle(changed())).toBe(true);
		expect(guard.handle(changed())).toBe(true); // a second in-flight call failing the same way
		await vi.waitFor(() => expect(deps.followContext).toHaveBeenCalledTimes(1));
		expect(deps.notify).toHaveBeenCalledTimes(1);
		expect(deps.notify).toHaveBeenCalledWith(SCOPE_CHANGED_MESSAGE);
		expect(deps.exitScope).not.toHaveBeenCalled();
		expect(deps.goto).not.toHaveBeenCalled();
		expect(deps.clearCache).not.toHaveBeenCalled();
	});

	it('can fire again after the first refresh settled', async () => {
		const { deps, guard } = setup({ pathname: '/settings/users', search: '' });
		guard.handle(changed());
		await vi.waitFor(() => expect(deps.followContext).toHaveBeenCalledTimes(1));
		await Promise.resolve();
		await Promise.resolve();
		guard.handle(changed());
		await vi.waitFor(() => expect(deps.followContext).toHaveBeenCalledTimes(2));
	});

	it('comes from the BFF response as its own error with its own copy', () => {
		const err = ApiError.fromResponse(new Response(null, { status: 409 }), {
			error: 'scope_changed',
			message: 'raw'
		});
		expect(err).toBeInstanceOf(ScopeChangedError);
		expect(err.message).toBe(SCOPE_CHANGED_MESSAGE);
		expect(err.code).toBe('scope_changed');
	});
});
