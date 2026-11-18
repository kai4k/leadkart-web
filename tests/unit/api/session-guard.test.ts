import { describe, expect, it, vi } from 'vitest';
import { createSessionGuard } from '#lib/api/session-guard.ts';
import {
	AuthError,
	ConflictError,
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
		resetCache: vi.fn(),
		notify: vi.fn(),
		exitScope: vi.fn(() => Promise.resolve()),
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

describe('session guard — scope_invalid', () => {
	const scopeError = () => new ScopeInvalidError('expired');

	it('exits scope, resets the cache, toasts, then goes to /operator/tenants — once', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		expect(guard.handle(scopeError())).toBe(true);
		expect(guard.handle(scopeError())).toBe(true);
		await vi.waitFor(() => expect(deps.goto).toHaveBeenCalledTimes(1));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
		expect(deps.resetCache).toHaveBeenCalledTimes(1);
		expect(deps.clearCache).not.toHaveBeenCalled();
		expect(deps.notify).toHaveBeenCalledTimes(1);
		expect(deps.notify).toHaveBeenCalledWith('Operator scope expired — select the tenant again');
		expect(deps.goto).toHaveBeenCalledWith('/operator/tenants');
		// The cache is emptied before navigation, not after.
		expect(deps.resetCache.mock.invocationCallOrder[0]).toBeLessThan(
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
