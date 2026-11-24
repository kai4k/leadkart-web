/**
 * A tab that comes back to the front, or gets focus, reconciles the impersonation session again, so it
 * picks up a session another tab started or ended (the mount effect alone covers only the first load).
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
	status: 'idle',
	reconcile: vi.fn(() => Promise.resolve())
}));
vi.mock('$app/state', () => ({ page: { data: { capabilities: { person_id: 'P1' } } } }));
vi.mock('#lib/features/operator/impersonation/stores/impersonation.svelte.ts', () => ({
	impersonation: {
		active: null,
		get status() {
			return store.status;
		},
		targetName: null,
		more: 0,
		readError: null,
		endError: null,
		checking: false,
		unknown: false,
		forget: vi.fn(),
		end: vi.fn(),
		reconcile: () => store.reconcile()
	}
}));
vi.mock('#lib/features/auth/index.ts', () => ({
	P: { platformImpersonationManage: 'platform.impersonation.manage' },
	session: { capabilities: { tier: 'platform' }, can: () => true }
}));

import ImpersonationBanner from '#lib/features/operator/impersonation/components/ImpersonationBanner.svelte';

let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	vi.clearAllMocks();
	store.status = 'idle';
	component = mount(ImpersonationBanner, {
		target: document.body.appendChild(document.createElement('div'))
	});
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
});

describe('impersonation reconcile triggers', () => {
	it('reconciles once on mount', () => {
		expect(store.reconcile).toHaveBeenCalledTimes(1);
	});
	it('reconciles again when the window gets focus', () => {
		window.dispatchEvent(new Event('focus'));
		expect(store.reconcile).toHaveBeenCalledTimes(2);
	});
	it('reconciles again when the tab becomes visible, not while hidden or while one is loading', () => {
		document.dispatchEvent(new Event('visibilitychange'));
		expect(store.reconcile).toHaveBeenCalledTimes(2);
		store.status = 'loading';
		window.dispatchEvent(new Event('focus'));
		expect(store.reconcile).toHaveBeenCalledTimes(2);
	});
	it('stops listening when unmounted', () => {
		unmount(component!);
		component = undefined;
		window.dispatchEvent(new Event('focus'));
		expect(store.reconcile).toHaveBeenCalledTimes(1);
	});
});

describe('impersonation reconcile triggers: never while End is running', () => {
	it('focus and visibility do not reconcile while the status is mutating', () => {
		store.status = 'mutating';
		window.dispatchEvent(new Event('focus'));
		document.dispatchEvent(new Event('visibilitychange'));
		expect(store.reconcile).toHaveBeenCalledTimes(1); // the mount one only
	});
});
