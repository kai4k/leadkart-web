import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Nav = { cancel: () => void; type: string; willUnload: boolean };
const h = vi.hoisted(() => ({
	callback: undefined as ((nav: Nav) => void) | undefined,
	pending: false
}));
vi.mock('$app/navigation', () => ({
	beforeNavigate: (cb: (nav: Nav) => void) => {
		h.callback = cb;
	}
}));
// the real hard-reset module is the contract: only its latch is faked, through the same export the guard reads
vi.mock('#lib/api/hard-reset.ts', () => ({ resetPending: () => h.pending }));

import { inRoot } from './root.svelte.ts';
import { releaseLeaveGuards, useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';

const nav = (over: Partial<Nav> = {}): Nav => ({
	cancel: vi.fn(),
	type: 'link',
	willUnload: false,
	...over
});
const unload = () => {
	const e = new Event('beforeunload', { cancelable: true });
	window.dispatchEvent(e);
	return e;
};

let dirty = true;
let dispose: () => void;
let confirmSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	dirty = true;
	h.pending = false;
	h.callback = undefined;
	confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
	dispose = inRoot(() => useLeaveGuard(() => dirty, 'Discard?')).dispose;
});
afterEach(() => {
	dispose();
	releaseLeaveGuards(false);
	confirmSpy.mockRestore();
});

describe('useLeaveGuard: in-app navigation', () => {
	it('dirty and the user declines: the navigation is cancelled, with the given message', () => {
		const n = nav();
		h.callback!(n);
		expect(confirmSpy).toHaveBeenCalledWith('Discard?');
		expect(n.cancel).toHaveBeenCalledOnce();
	});

	it('dirty and the user accepts: the navigation goes on', () => {
		confirmSpy.mockReturnValue(true);
		const n = nav();
		h.callback!(n);
		expect(n.cancel).not.toHaveBeenCalled();
	});

	it('not dirty: nothing is asked and nothing is cancelled', () => {
		dirty = false;
		const n = nav();
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
	});

	it('a leave (the page unloads) is left to the native beforeunload prompt: no confirm() during unload', () => {
		const n = nav({ type: 'leave', willUnload: true });
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
	});
});

describe('useLeaveGuard: closing the tab', () => {
	it('beforeunload is default-prevented only when dirty', () => {
		expect(unload().defaultPrevented).toBe(true);
		dirty = false;
		expect(unload().defaultPrevented).toBe(false);
	});

	it('the listener is removed when the guard is disposed', () => {
		dispose();
		expect(unload().defaultPrevented).toBe(false);
		dispose = inRoot(() => useLeaveGuard(() => dirty)).dispose;
	});
});

describe('useLeaveGuard never gets in the way of the security reload or of signing out', () => {
	it('a hard reset under way (resetPending() true): a dirty form is neither asked about nor cancelled, nor does beforeunload prompt', () => {
		h.pending = true;
		const n = nav();
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
		expect(unload().defaultPrevented).toBe(false);
	});

	it('a hard reset that begins after the guard was installed is honoured at the time of the event', () => {
		expect(unload().defaultPrevented).toBe(true);
		h.pending = true;
		expect(unload().defaultPrevented).toBe(false);
	});

	it('sign-out (releaseLeaveGuards) lets the page go without a prompt, even dirty', () => {
		releaseLeaveGuards();
		const n = nav();
		h.callback!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
		expect(unload().defaultPrevented).toBe(false);
	});
});
