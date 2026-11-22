import { expect, test } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { listMockCalls, registerMock, resetMock } from './helpers/mock';

/**
 * An operator whose session list cannot be read: the banner says the status is unknown (never "none"), Retry reads
 * again, and nothing ever ends a session.
 */
test.describe('impersonation: unknown status', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('a failed read shows the unknown state; Retry reads again and clears it; no DELETE is ever sent', async ({
		page
	}) => {
		await signInAsTier(page, { tier: 'platform-super', permissions: [] });
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/impersonation/sessions',
			status: 500,
			body: { error: 'internal_error' }
		});
		await page.goto('/dashboard');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		const banner = page.getByRole('region', { name: 'Impersonation session' });
		await expect(banner).toContainText('Could not check impersonation status.');
		// the status is readable again: Retry clears the state
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/impersonation/sessions',
			status: 200,
			body: { sessions: [] }
		});
		await banner.getByRole('button', { name: 'Retry' }).click();
		await expect(banner).toHaveCount(0);
		const calls = await listMockCalls();
		expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
	});
});
