import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Nav = {
	cancel: () => void;
	type: string;
	willUnload: boolean;
	to: { route: { id: string | null }; url: URL } | null;
};
const h = vi.hoisted(() => ({
	callback: undefined as ((nav: Nav) => void) | undefined,
	pending: false
}));
vi.mock('$app/navigation', () => ({
	beforeNavigate: (cb: (nav: Nav) => void) => {
		h.callback = cb;
	}
}));
vi.mock('#lib/api/hard-reset.ts', () => ({ resetPending: () => h.pending }));

import { inRoot } from './root.svelte.ts';
import { releaseLeaveGuards, useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';
import { AuthError, SESSION_EXPIRED_CODE } from '#lib/api/errors.ts';
import { createSessionGuard } from '#lib/api/session-guard.ts';

const nav = (
	type: string,
	route: string | null = '/(app)/leads',
	over: Partial<Nav> = {}
): Nav => ({
	cancel: vi.fn(),
	type,
	willUnload: false,
	to: { route: { id: route }, url: new URL('http://localhost/x') },
	...over
});

let dispose: () => void;
let confirmSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	h.pending = false;
	confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
	dispose = inRoot(() => useLeaveGuard(() => true)).dispose;
});
afterEach(() => {
	dispose();
	releaseLeaveGuards(false);
	confirmSpy.mockRestore();
});

/** The rule: only a navigation the USER started (a link, Back / Forward) is questioned. */
describe('leave guard: which navigations it questions', () => {
	it.each([
		['link', true],
		['popstate', true],
		['goto', false],
		['form', false],
		['enter', false],
		['leave', false]
	])('type %s: asks = %s', (type, asks) => {
		const n = nav(type);
		h.callback!(n);
		expect(confirmSpy).toHaveBeenCalledTimes(asks ? 1 : 0);
		expect(n.cancel).toHaveBeenCalledTimes(asks ? 1 : 0);
	});

	it('a user link into the (auth) group is never questioned', () => {
		const n = nav('link', '/(auth)/signin');
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
	});

	it('a hard reset under way: nothing is asked even for a link', () => {
		h.pending = true;
		const n = nav('link');
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
	});

	it('after sign-out: nothing is asked even for a link', () => {
		releaseLeaveGuards();
		const n = nav('popstate');
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
	});
});

describe('leave guard with the REAL session guard', () => {
	it('a 401 session_expired with a dirty form: the redirect to /signin happens, no prompt, no cancellation', () => {
		const cancels: Nav[] = [];
		const guard = createSessionGuard({
			goto: (url) => {
				// what SvelteKit's goto does: a programmatic navigation runs the beforeNavigate callbacks
				const n = nav('goto', '/(auth)/signin');
				h.callback!(n);
				cancels.push(n);
				return Promise.resolve(url);
			},
			clearCache: () => {},
			notify: () => {},
			exitScope: () => Promise.resolve(),
			leaveScope: () => true,
			foreignChange: () => {},
			location: () => ({ pathname: '/leads', search: '' })
		});
		const error = new AuthError(401);
		(error as { code?: string }).code = SESSION_EXPIRED_CODE;
		expect(guard.handle(error)).toBe(true);
		expect(cancels).toHaveLength(1);
		expect(cancels[0]!.cancel).not.toHaveBeenCalled();
		expect(confirmSpy).not.toHaveBeenCalled();
	});

	it('an in-page URL update (filters, pagination: goto with replaceState) is not questioned', () => {
		const n = nav('goto', '/(app)/leads');
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
	});
});
