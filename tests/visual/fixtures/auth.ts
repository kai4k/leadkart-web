import type { Page } from '@playwright/test';
import { signInAsTier, type SignInOpts } from '../../e2e/helpers/sign-in';
import { resetMock, registerMocks, type MockFixture } from '../../e2e/helpers/mock';

/**
 * Auth fixture for visual regression tests.
 *
 * Visual tests aren't testing the auth flow — they're verifying pixel-
 * stable renders of authenticated pages. This wrapper:
 *
 *   1. resets the mock-server (prior-test state cleared)
 *   2. registers any per-test fixtures the route needs (capabilities,
 *      list responses, detail DTOs, etc.)
 *   3. drives the signin form once via the existing e2e helper
 *      (signInAsTier already handles capabilities + cookies)
 *   4. lands the page on /dashboard, ready for goto() to the target
 *      visual-test route
 *
 * The signin-form overhead (~1s) is amortised by the per-test mock-reset
 * isolation it gives us — each visual test runs from a clean mock state
 * with only its declared fixtures registered. Storage-state-based auth
 * would shave the second but require dual-tracking cookies vs mocks;
 * the e2e helper already encodes both correctly.
 *
 * Re-uses fake JWTs from tests/e2e/helpers/fake-jwt.ts so visual tests
 * stay in sync with e2e — when claim shapes change, both suites update
 * via one constant.
 */

export interface VisualAuthOpts extends SignInOpts {
	/** Extra mock fixtures registered AFTER signin's baseline fixtures. */
	mocks?: MockFixture[];
}

export async function signInForVisual(page: Page, opts: VisualAuthOpts): Promise<void> {
	await resetMock();
	await signInAsTier(page, opts);
	if (opts.mocks && opts.mocks.length > 0) {
		await registerMocks(opts.mocks);
	}
}
