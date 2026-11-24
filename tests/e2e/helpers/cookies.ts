import { expect, type BrowserContext } from '@playwright/test';

/**
 * Assert that none of `names` is in the browser's cookie jar, polling. A response's `Set-Cookie` clear is applied by the
 * browser after the response (and, in Firefox, after the navigation that followed it has already settled), so a single
 * `context.cookies()` read right after the action can still see the old cookie and fail on a slow run.
 */
export async function expectCookiesGone(context: BrowserContext, names: string[]): Promise<void> {
	await expect
		.poll(
			async () => {
				const present = (await context.cookies()).map((c) => c.name);
				return names.filter((n) => present.includes(n));
			},
			{ message: `cookies still present: ${names.join(', ')}` }
		)
		.toEqual([]);
}
