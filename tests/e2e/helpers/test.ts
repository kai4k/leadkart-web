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
import { expect, test as base } from '@playwright/test';
import { listUnregisteredCalls } from './mock.ts';

export async function assertNoUnregisteredCalls(): Promise<void> {
	const calls = await listUnregisteredCalls();
	expect(
		calls.map((c) => `${c.method} ${c.path}`),
		'calls the mock Go API had no fixture for (register one, or test.use({ allowUnregistered: true }) with a reason)'
	).toEqual([]);
}

export const test = base.extend<{ allowUnregistered: boolean; noUnregisteredCalls: void }>({
	allowUnregistered: [false, { option: true }],
	noUnregisteredCalls: [
		async ({ allowUnregistered }, use) => {
			await use();
			if (!allowUnregistered) await assertNoUnregisteredCalls();
		},
		{ auto: true }
	]
});

export { expect };
export type { BrowserContext, Page, Route } from '@playwright/test';
