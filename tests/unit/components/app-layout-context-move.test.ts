/**
 * The (app) layout is where "a page never keeps its state when its context moves" is made
 * structural. When the layout commits a context this tab did not change itself, the children are
 * REMOVED (a form that stays mounted could submit under the new fingerprint) and nothing can be
 * sent through the API client; this must hold when the hard reset cannot happen (offline) too.
 */
import { createRawSnippet, flushSync, mount, tick, unmount } from 'svelte';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', async () => ({
	page: (await import('./reactive-page.svelte.ts')).createReactivePage('fp-a')
}));
const refreshCapabilities = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('#lib/api/capabilities-refresh.ts', () => ({ refreshCapabilities }));
vi.mock('#lib/api/query-client.ts', async () => {
	const { QueryClient } = await import('@tanstack/svelte-query');
	return { renderQueryClient: () => new QueryClient() };
});
vi.mock('#lib/hooks/index.ts', () => ({ useRefreshOnFocus: () => {} }));
vi.mock('$features/operator/impersonation', async () => ({
	ImpersonationBanner: (await import('./stubs/Nothing.svelte')).default
}));
vi.mock('$layouts/AppShell.svelte', async () => ({
	default: (await import('./stubs/PassThrough.svelte')).default
}));
vi.mock('$layouts/NavProgressBar.svelte', async () => ({
	default: (await import('./stubs/Nothing.svelte')).default
}));
vi.mock('$layouts/PwaStatusBar.svelte', async () => ({
	default: (await import('./stubs/Nothing.svelte')).default
}));
vi.mock('$layouts/ReloadNotice.svelte', async () => ({
	default: (await import('./stubs/Nothing.svelte')).default
}));

import { page } from '$app/state';
import Layout from '../../../src/routes/(app)/+layout.svelte';
import { api } from '#lib/api/client.ts';
import { ScopeChangedError } from '#lib/api/errors.ts';
import { resetBlock } from '#lib/api/reset-block.svelte.ts';

const fetchSpy = vi.fn();
let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

const child = createRawSnippet(() => ({ render: () => '<form data-testid="child">typed</form>' }));
const render = async () => {
	component = mount(Layout, { target, props: { children: child } });
	flushSync();
	await tick();
};
const commit = (scopeContext: string) => {
	(page as unknown as { data: { scopeContext: string } }).data = { scopeContext };
	flushSync();
};
const childPresent = () => target.querySelector('[data-testid="child"]') !== null;

beforeEach(() => {
	vi.clearAllMocks();
	sessionStorage.clear();
	resetBlock.clear();
	commit('fp-a');
	vi.stubGlobal('fetch', fetchSpy);
	vi.stubGlobal('location', { replace: vi.fn(), pathname: '/leads', search: '' });
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	vi.unstubAllGlobals();
});

describe('(app) layout: a committed context this tab did not change', () => {
	it('offline (the reset is blocked): the children are removed and a call through the API client is refused before any network call', async () => {
		vi.stubGlobal('navigator', { onLine: false });
		await render();
		expect(childPresent()).toBe(true);

		commit('fp-b'); // the cookie moved without anyone announcing it

		expect(resetBlock.kind).toBe('offline');
		expect(childPresent()).toBe(false);
		await expect(api.get('/v1/leads', z.unknown())).rejects.toBeInstanceOf(ScopeChangedError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('online: the reset starts, the children go, and nothing is sent while the document is being replaced', async () => {
		vi.stubGlobal('navigator', { onLine: true });
		await render();
		commit('fp-b');
		expect(childPresent()).toBe(false);
		await expect(api.get('/v1/leads', z.unknown())).rejects.toBeInstanceOf(ScopeChangedError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('the same context committed again changes nothing', async () => {
		vi.stubGlobal('navigator', { onLine: true });
		await render();
		commit('fp-a');
		expect(childPresent()).toBe(true);
	});
});

describe('(app) layout: a reset that was declined', () => {
	it('a block banner (loop stop) removes the children too: a stale page is never interactive', async () => {
		await render();
		expect(childPresent()).toBe(true);
		resetBlock.show('loop');
		flushSync();
		expect(childPresent()).toBe(false);
	});
});

describe('(app) layout: back/forward cache', () => {
	const pageshow = (persisted: boolean) =>
		window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }));

	it('a page restored from the cache re-runs the layout (its commit goes through the context check)', async () => {
		await render();
		pageshow(true);
		expect(refreshCapabilities).toHaveBeenCalledTimes(1);
	});

	it('an ordinary pageshow (not restored) does nothing', async () => {
		await render();
		pageshow(false);
		expect(refreshCapabilities).not.toHaveBeenCalled();
	});

	it('the listener is removed with the layout', async () => {
		await render();
		unmount(component!);
		component = undefined;
		pageshow(true);
		expect(refreshCapabilities).not.toHaveBeenCalled();
	});
});
