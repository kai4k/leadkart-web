import { describe, expect, it, vi } from 'vitest';
import { createSessionGuard } from '#lib/api/session-guard.ts';
import { AuthError, ConflictError, ServerError } from '#lib/api/errors.ts';

function setup(location = { pathname: '/leads', search: '?page=2' }) {
	const deps = {
		goto: vi.fn(),
		clearCache: vi.fn(),
		notify: vi.fn(),
		location: () => location
	};
	return { deps, guard: createSessionGuard(deps) };
}

describe('session guard — 401', () => {
	it('clears the cache and sends the user to /signin with next, once', () => {
		const { deps, guard } = setup();
		expect(guard.handle(new AuthError(401))).toBe(true);
		expect(guard.handle(new AuthError(401))).toBe(true);
		expect(deps.clearCache).toHaveBeenCalledTimes(1);
		expect(deps.goto).toHaveBeenCalledTimes(1);
		expect(deps.goto).toHaveBeenCalledWith(`/signin?next=${  encodeURIComponent('/leads?page=2')}`);
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
		expect(guard.handle(new AuthError(401))).toBe(true);
		expect(deps.goto).not.toHaveBeenCalled();
	});

	it('ordinary 409 conflicts are not handled', () => {
		const { guard } = setup();
		expect(guard.handle(new ConflictError('dup'))).toBe(false);
	});
});
