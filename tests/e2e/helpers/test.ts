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
import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { listMockCalls, listUnregisteredCalls } from './mock.ts';
import { currentFingerprint } from './scope-fingerprint.ts';

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
 * The app's own calls carry the tenant-context fingerprint of their page (`x-lk-scope-context`, read
 * from the page data by the one API client) and the BFF refuses a call without it. Nothing here
 * patches the app's fetches: they are the thing under test. A spec that speaks to the proxy itself
 * calls `window.specFetch(...)` inside `page.evaluate` (declared below): a plain `fetch` that adds
 * the fingerprint THE PAGE SHOWS (what its own calls last carried) unless the spec set the header itself. `page.request` calls set
 * the header from `currentFingerprint(context)`.
 */
declare global {
	interface Window {
		specFetch: typeof fetch;
		__e2eContextFingerprint: () => Promise<string>;
	}
}

const SPEC_FETCH = () => {
	window.specFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const headers = new Headers(init?.headers);
		headers.set('x-e2e-spec-call', '1'); // so the harness does not mistake it for the page's own call
		if (!headers.has('x-lk-scope-context')) {
			headers.set('x-lk-scope-context', await window.__e2eContextFingerprint());
		}
		return window.fetch(input, { ...init, headers });
	};
};

export const test = base.extend<{
	allowUnregistered: boolean;
	specFetch: void;
	noUnregisteredCalls: void;
	noHoverPreload: void;
}>({
	allowUnregistered: [false, { option: true }],
	specFetch: [
		async ({ context }, use) => {
			// What each page shows = the fingerprint its own (app) calls last carried (the app reads it from
			// its committed page data); at a document load or client-side navigation, the cookies' context then; failing both, the cookies' now.
			const shown = new WeakMap<Page, string>();
			context.on('request', (req) => {
				const fp = req.headers()['x-lk-scope-context'];
				if (!fp || req.headers()['x-e2e-spec-call'] || !req.url().includes('/api/')) return;
				try {
					shown.set(req.frame().page(), fp);
				} catch {
					// a request with no page (service worker, prefetch): nothing to remember
				}
			});
			// A document load or a client-side navigation shows the context its server data was rendered from:
			// the cookies' at that moment.
			const remember = (p: Page) => {
				void currentFingerprint(context).then((fp) => {
					// No session yet (the sign-in page) shows no context: keep what was known.
					if (fp !== 'invalid') shown.set(p, fp);
				});
			};
			const onLoad = (p: Page) => {
				p.on('load', () => remember(p));
				p.on('framenavigated', (frame) => {
					if (frame === p.mainFrame()) remember(p);
				});
			};
			context.pages().forEach(onLoad);
			context.on('page', onLoad);
			await context.exposeBinding(
				'__e2eContextFingerprint',
				({ page }) => (page && shown.get(page)) || currentFingerprint(context)
			);
			await context.addInitScript(SPEC_FETCH);
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
