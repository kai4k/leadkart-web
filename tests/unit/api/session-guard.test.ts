import { describe, expect, it, vi } from 'vitest';
import { SCOPE_CHANGED_MESSAGE } from '#lib/api/scope-header.ts';
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
		leaveScope: vi.fn(() => true),
		foreignChange: vi.fn(),
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
		await vi.waitFor(() => expect(deps.leaveScope).toHaveBeenCalledTimes(1));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
		expect(deps.goto).not.toHaveBeenCalled(); // never an in-place follow
	});
});

describe('session guard — scope_invalid', () => {
	const scopeError = () => new ScopeInvalidError('expired');

	it('deletes the cookie, then leaves by a full navigation (leaveScope) — once, never an in-place follow', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		expect(guard.handle(scopeError())).toBe(true);
		expect(guard.handle(scopeError())).toBe(true);
		await vi.waitFor(() => expect(deps.leaveScope).toHaveBeenCalledTimes(1));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
		// No in-place navigation, no toast posted into a document that is about to be replaced
		// (the reason is shown after the load), and the cache is cleared by the navigation itself.
		expect(deps.goto).not.toHaveBeenCalled();
		expect(deps.notify).not.toHaveBeenCalled();
		expect(deps.exitScope.mock.invocationCallOrder[0]).toBeLessThan(
			deps.leaveScope.mock.invocationCallOrder[0]
		);
	});

	it('a leave that did not navigate (declined, or blocked behind a banner) releases the guard: a later session_expired is still handled', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		deps.leaveScope.mockReturnValue(false);
		guard.handle(scopeError());
		await vi.waitFor(() => expect(deps.leaveScope).toHaveBeenCalledTimes(1));
		const expired = new AuthError(401);
		expired.code = SESSION_EXPIRED_CODE;
		expect(guard.handle(expired)).toBe(true);
		expect(deps.goto).toHaveBeenCalledWith('/signin?next=%2Foperator%2Fscope%2Fmembers');
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

	it('a straggling 409 after the page started leaving does not start a second exit', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/profile', search: '' });
		guard.handle(scopeError());
		await vi.waitFor(() => expect(deps.leaveScope).toHaveBeenCalledTimes(1));
		await Promise.resolve();
		guard.handle(scopeError());
		await Promise.resolve();
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
		expect(deps.leaveScope).toHaveBeenCalledTimes(1);
	});
});

describe('session guard: scope errors regardless of HTTP status', () => {
	it('handles a ScopeInvalidError that arrived as 404 tenant_scope_not_found', async () => {
		const deps = {
			goto: vi.fn(() => Promise.resolve()),
			clearCache: vi.fn(),
			notify: vi.fn(),
			exitScope: vi.fn(() => Promise.resolve()),
			leaveScope: vi.fn(() => true),
			foreignChange: vi.fn(),
			location: () => ({ pathname: '/operator/scope/members', search: '' })
		};
		const guard = createSessionGuard(deps);
		const err = ApiError.fromResponse(new Response(null, { status: 404 }), {
			error: 'tenant_scope_not_found'
		});
		expect(guard.handle(err)).toBe(true);
		await vi.waitFor(() => expect(deps.leaveScope).toHaveBeenCalledTimes(1));
		expect(deps.exitScope).toHaveBeenCalledTimes(1);
	});
});

describe('session guard — scope_changed (another tab changed the context)', () => {
	const changed = () => new ScopeChangedError('x');

	it('hands the change to the one foreign-change path (which tells the user after the load); nothing navigates here', () => {
		const { deps, guard } = setup({ pathname: '/settings/users', search: '' });
		expect(guard.handle(changed())).toBe(true);
		expect(guard.handle(changed())).toBe(true); // a second in-flight call failing the same way
		expect(deps.foreignChange).toHaveBeenCalledTimes(2);
		expect(deps.notify).not.toHaveBeenCalled(); // a toast posted before the reset dies with the document
		expect(deps.exitScope).not.toHaveBeenCalled();
		expect(deps.goto).not.toHaveBeenCalled();
		expect(deps.clearCache).not.toHaveBeenCalled();
	});

	it('an exit answered 409 scope_changed is a foreign change (reload), not a failure to leave: no sign-out', async () => {
		const { deps, guard } = setup({ pathname: '/operator/scope/members', search: '' });
		deps.exitScope.mockRejectedValue(changed());
		expect(guard.handle(new ScopeInvalidError('expired'))).toBe(true);
		await vi.waitFor(() => expect(deps.foreignChange).toHaveBeenCalledTimes(1));
		expect(deps.goto).not.toHaveBeenCalled();
		expect(deps.clearCache).not.toHaveBeenCalled();
		expect(deps.notify).not.toHaveBeenCalledWith(
			'Could not leave the tenant context — signing out'
		);
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
