/**
 * The impersonation banner: the target name (or the fallback copy), the End control, and the stale
 * state while a reset is pending or under way.
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
	state: {
		active: null as null | { session_id: string; reason: string; expires_at: string },
		status: 'active',
		targetName: null as string | null,
		more: 0,
		error: null as string | null,
		unknown: false,
		can: true,
		end: vi.fn(),
		forget: vi.fn(),
		reconcile: vi.fn(() => Promise.resolve())
	}
}));
vi.mock('#lib/features/operator/impersonation/stores/impersonation.svelte.ts', () => ({
	impersonation: {
		get active() {
			return store.state.active;
		},
		get status() {
			return store.state.status;
		},
		get targetName() {
			return store.state.targetName;
		},
		get more() {
			return store.state.more;
		},
		get error() {
			return store.state.error;
		},
		get unknown() {
			return store.state.unknown;
		},
		forget: () => store.state.forget(),
		end: (...a: unknown[]) => store.state.end(...a),
		reconcile: () => store.state.reconcile()
	}
}));
vi.mock('$features/auth', () => ({
	P: { platformImpersonationManage: 'platform.impersonation.manage' },
	session: {
		capabilities: null,
		can: () => store.state.can
	}
}));

import ImpersonationBanner from '#lib/features/operator/impersonation/components/ImpersonationBanner.svelte';
import { hardReset } from '#lib/api/hard-reset.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';
import en from '../../../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

beforeEach(() => {
	vi.clearAllMocks();
	sessionStorage.clear();
	store.state.active = { session_id: 'A', reason: 'support', expires_at: '2030-01-01T00:00:00Z' };
	store.state.status = 'active';
	store.state.targetName = null;
	store.state.more = 0;
	store.state.error = null;
	store.state.unknown = false;
	store.state.can = true;
	store.state.end.mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	window.dispatchEvent(new Event('pageshow'));
	if (component) unmount(component);
	component = undefined;
	resetBlock.clear();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

const render = () => {
	component = mount(ImpersonationBanner, { target });
	flushSync();
};
const endButton = () =>
	document.querySelector<HTMLButtonElement>(
		`button[aria-label="${en.shell.impersonation.endLabel}"]`
	)!;

describe('ImpersonationBanner', () => {
	it('names the company when the store has the name of the active session', () => {
		store.state.targetName = 'Alpha';
		render();
		expect(document.body.textContent).toContain('Impersonating');
		expect(document.querySelector('bdi')!.textContent).toBe('Alpha');
	});

	it('says "a company" when the name is not known (after a reload)', () => {
		render();
		expect(document.body.textContent).toContain(en.shell.impersonation.impersonatingCompany);
		expect(document.querySelector('bdi')).toBeNull();
	});

	it('renders nothing without an active session', () => {
		store.state.active = null;
		render();
		expect(document.querySelector('[role="region"]')).toBeNull();
	});

	it('End calls the store once', async () => {
		render();
		endButton().click();
		flushSync();
		await tick();
		expect(store.state.end).toHaveBeenCalledTimes(1);
		expect(store.state.end).toHaveBeenCalledWith('A'); // the id shown at click time
	});

	it('a failed End is rendered in the banner and the button becomes Retry', () => {
		store.state.error = 'Could not end the session.';
		render();
		expect(document.querySelector('[role="alert"]')!.textContent).toBe(
			'Could not end the session.'
		);
		expect(endButton().textContent).toContain(en.shell.impersonation.retry);
	});

	it('says how many more sessions the server lists', () => {
		store.state.more = 2;
		render();
		expect(document.body.textContent).toContain('+2 more');
	});

	it('an unknown status (the read failed, nothing shown) is a neutral notice with Retry, for people who can impersonate', async () => {
		store.state.active = null;
		store.state.unknown = true;
		render();
		expect(document.body.textContent).toContain(en.shell.impersonation.unknown);
		const retry = [...document.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === en.shell.impersonation.retry
		)!;
		store.state.reconcile.mockClear();
		retry.click();
		flushSync();
		await tick();
		expect(store.state.reconcile).toHaveBeenCalledTimes(1);
	});

	it('people who cannot impersonate: nothing is shown and no read is made', () => {
		store.state.can = false;
		store.state.active = null;
		store.state.unknown = true;
		render();
		expect(document.querySelector('[role="region"]')).toBeNull();
		expect(store.state.reconcile).not.toHaveBeenCalled();
	});

	it('leaving the app (unmount) empties the store', () => {
		render();
		unmount(component!);
		component = undefined;
		expect(store.state.forget).toHaveBeenCalledTimes(1);
	});

	it('End is aria-disabled and does nothing while a block banner is up', async () => {
		resetBlock.show('stalled');
		render();
		expect(endButton().getAttribute('aria-disabled')).toBe('true');
		endButton().click();
		flushSync();
		await tick();
		expect(store.state.end).not.toHaveBeenCalled();
	});

	it('End turns stale the moment a reset starts and acts again after the page is restored', async () => {
		vi.stubGlobal('location', { replace: vi.fn(), pathname: '/x', search: '' });
		render();
		expect(endButton().getAttribute('aria-disabled')).toBeNull();
		expect(hardReset('session')).toBe(true);
		flushSync();
		expect(endButton().getAttribute('aria-disabled')).toBe('true');
		endButton().click();
		flushSync();
		await tick();
		expect(store.state.end).not.toHaveBeenCalled();
		window.dispatchEvent(new Event('pageshow'));
		flushSync();
		expect(endButton().getAttribute('aria-disabled')).toBeNull();
	});
});
