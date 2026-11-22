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
		readError: null as string | null,
		endError: null as string | null,
		checking: false,
		unknown: false,
		// the real capability data the real `can` reads (not a boolean switch)
		permissions: ['platform.impersonation.manage'] as string[],
		end: vi.fn(),
		forget: vi.fn(),
		reconcile: vi.fn(() => Promise.resolve())
	}
}));
vi.mock('$app/state', () => ({ page: { data: { capabilities: { person_id: 'P1' } } } }));
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
		get readError() {
			return store.state.readError;
		},
		get endError() {
			return store.state.endError;
		},
		get checking() {
			return store.state.checking;
		},
		get unknown() {
			return store.state.unknown;
		},
		forget: () => store.state.forget(),
		end: (...a: unknown[]) => store.state.end(...a),
		reconcile: () => store.state.reconcile()
	}
}));
vi.mock('$features/auth', async () => {
	const { can } = await import('#lib/features/auth/capabilities.ts');
	const caps = () => ({ effective_permissions: store.state.permissions }) as never;
	return {
		P: { platformImpersonationManage: 'platform.impersonation.manage' },
		session: {
			get capabilities() {
				return caps();
			},
			can: (permission: string) => can(caps(), permission)
		}
	};
});

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
	store.state.readError = null;
	store.state.endError = null;
	store.state.checking = false;
	store.state.unknown = false;
	store.state.permissions = ['platform.impersonation.manage'];
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
	[...document.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
		[en.shell.impersonation.end, en.shell.impersonation.endRetry].includes(
			b.textContent?.trim() ?? ''
		)
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

	it('a failed End is rendered in the banner and the button says Try ending again', () => {
		store.state.endError = 'Could not end the session.';
		render();
		expect(document.querySelector('[role="alert"]')!.textContent).toBe(
			'Could not end the session.'
		);
		expect(endButton().textContent).toContain(en.shell.impersonation.endRetry);
	});

	it('a failed READ while a session is shown: the End button still says End and ends; Retry reads and never ends', async () => {
		store.state.readError = 'Network down';
		render();
		expect(endButton().textContent).toContain(en.shell.impersonation.end);
		expect(endButton().hasAttribute('aria-label')).toBe(false); // the name is the visible text
		const retry = [...document.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === en.shell.impersonation.retry
		)!;
		store.state.reconcile.mockClear();
		retry.click();
		flushSync();
		await tick();
		expect(store.state.reconcile).toHaveBeenCalledTimes(1);
		expect(store.state.end).not.toHaveBeenCalled();
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

	it('a person with the impersonate capability: exactly one read on mount', () => {
		render();
		expect(store.state.reconcile).toHaveBeenCalledTimes(1);
	});

	it('people who cannot impersonate: nothing is shown and no read is made', () => {
		store.state.permissions = ['crm.leads.view'];
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
