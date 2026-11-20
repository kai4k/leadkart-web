/**
 * ReloadNotice: after a hard reset the new page says why, once; when a reset could not happen
 * (offline, or the page itself came from a reset) a banner stands in. Copy comes from the locale table.
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../src/lib/i18n/locales/en.json';

const info = vi.hoisted(() => vi.fn());
vi.mock('$ui', async () => ({
	...(await vi.importActual<object>('$ui')),
	toast: { info }
}));

import ReloadNotice from '$layouts/ReloadNotice.svelte';
import { RELOAD_REASON_KEY } from '#lib/api/hard-reset.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const render = async () => {
	component = mount(ReloadNotice, { target });
	flushSync();
	await tick();
};
const leave = (reason: string) =>
	sessionStorage.setItem(RELOAD_REASON_KEY, JSON.stringify({ reason, at: Date.now() }));

beforeEach(() => {
	vi.clearAllMocks();
	sessionStorage.clear();
	resetBlock.clear();
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

describe('ReloadNotice toast after the load', () => {
	it.each([
		['context', en.reload.context],
		['session', en.reload.session],
		['scope', en.errors.code.scope_invalid]
	])('%s: one toast with the copy-table line, and the reason is consumed', async (reason, line) => {
		leave(reason);
		await render();
		// One macrotask later: the root Toaster empties the queue when it mounts, after this child.
		await vi.waitFor(() => expect(info).toHaveBeenCalledWith(line));
		expect(info).toHaveBeenCalledTimes(1);
		expect(sessionStorage.getItem(RELOAD_REASON_KEY)).toBeNull();
	});

	it('an ordinary load says nothing', async () => {
		await render();
		expect(info).not.toHaveBeenCalled();
		expect(target.textContent).toBe('');
	});
});

describe('ReloadNotice banner when a reset could not happen', () => {
	it('offline: says the page is out of date and offers Reload', async () => {
		resetBlock.show('offline');
		await render();
		expect(target.textContent).toContain(en.reload.offline.title);
		expect(target.querySelector('button')?.textContent).toContain(en.reload.offline.action);
	});

	it('loop: offers signing in again', async () => {
		resetBlock.show('loop');
		await render();
		expect(target.textContent).toContain(en.reload.loop.title);
		expect(target.querySelector('button')?.textContent).toContain(en.reload.loop.action);
	});
});
