/**
 * The e2e `test` every spec imports (instead of `@playwright/test`).
 *
 * Adds one automatic check: a call the BFF made to the mock Go API that no fixture answered
 * (the mock replies 404 `mock_not_registered`) FAILS the test that triggered it. Before, that was a
 * silent 404 the app could shrug off, so a spec could pass while the app asked Go for something the
 * test never described.
 *
 * A spec that deliberately lets calls go unanswered opts out for the whole file or a describe block:
 *   test.use({ allowUnregistered: true });   // say why next to it
 */
import { expect, test as base, type BrowserContext } from '@playwright/test';
import { listMockCalls, listUnregisteredCalls } from './mock.ts';

export async function assertNoUnregisteredCalls(testTitle?: string): Promise<void> {
	const calls = await listUnregisteredCalls();
	expect(
		calls.map((c) => `${c.method} ${c.path}`),
		`calls the mock Go API had no fixture for${testTitle ? ` while "${testTitle}" ran` : ''} (register one, or test.use({ allowUnregistered: true }) with a reason)`
	).toEqual([]);
}

/**
 * Let everything the test started finish BEFORE its calls are judged and BEFORE its page closes:
 * pages idle, then the mock's call count unchanged across two samples. A server load still in
 * flight at teardown would otherwise reach the mock after the NEXT test's reset and fail that
 * test instead. After this, a call the check sees belongs to the test that is ending.
 */
async function settle(context: BrowserContext): Promise<void> {
	await Promise.all(
		context
			.pages()
			.map((p) => p.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {}))
	);
	let last = -1;
	for (let i = 0; i < 20; i++) {
		const n = (await listMockCalls()).length;
		if (n === last) return;
		last = n;
		await new Promise((r) => setTimeout(r, 150));
	}
}

/**
 * `data-sveltekit-preload-data="hover"` (app.html) makes SvelteKit run a route's server load as
 * soon as the mouse is over a link. Playwright hovers every element it clicks, so a spec could
 * trigger loads for routes it never visits and never registered. Under test the attribute is
 * switched off on <body> before the app starts; navigation itself is unchanged.
 */
const DISABLE_HOVER_PRELOAD = () => {
	const off = () => document.body?.setAttribute('data-sveltekit-preload-data', 'off');
	if (document.body) off();
	else document.addEventListener('DOMContentLoaded', off);
};

/**
 * Every call the APP makes to /api carries the tenant-context fingerprint of its page
 * (`x-lk-scope-context`, see api/scope-context.ts) and the BFF refuses a call without it. A spec that
 * speaks to the proxy itself (`page.evaluate(() => fetch('/api/v1/...'))`) is not the app, so by
 * default it speaks the way the page does: the fingerprint in the DOM (or `none` before any page).
 * A spec that tests the proxy's treatment of the header sets `test.use({ rawProxyCalls: true })`.
 */
const PAGE_CONTEXT_FETCH = () => {
	const original = window.fetch.bind(window);
	window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
		const url =
			typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
		let sent = init;
		if (url.startsWith('/api/v1/')) {
			const headers = new Headers(init?.headers);
			if (!headers.has('x-lk-scope-context')) {
				const fp =
					document.querySelector('[data-scope-context]')?.getAttribute('data-scope-context') ??
					'none';
				headers.set('x-lk-scope-context', fp);
				sent = { ...init, headers };
			}
		}
		return original(input, sent);
	};
};

export const test = base.extend<{
	allowUnregistered: boolean;
	rawProxyCalls: boolean;
	pageContextFetch: void;
	noUnregisteredCalls: void;
	noHoverPreload: void;
}>({
	allowUnregistered: [false, { option: true }],
	rawProxyCalls: [false, { option: true }],
	pageContextFetch: [
		async ({ context, rawProxyCalls }, use) => {
			if (!rawProxyCalls) await context.addInitScript(PAGE_CONTEXT_FETCH);
			await use();
		},
		{ auto: true }
	],
	noHoverPreload: [
		async ({ context }, use) => {
			await context.addInitScript(DISABLE_HOVER_PRELOAD);
			await use();
		},
		{ auto: true }
	],
	// Depends on `context` so its teardown (the check) runs while the pages are still open.
	noUnregisteredCalls: [
		async ({ allowUnregistered, context }, use, testInfo) => {
			await use();
			if (allowUnregistered) return;
			await settle(context);
			await assertNoUnregisteredCalls(testInfo.titlePath.join(' > '));
		},
		{ auto: true }
	]
});

export { expect };
export type { BrowserContext, Page, Route } from '@playwright/test';
