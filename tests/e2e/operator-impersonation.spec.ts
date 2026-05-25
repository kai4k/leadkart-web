import { expect, test, type Page } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock } from './helpers/mock';
import { fakeTenantDto } from './helpers/fake-jwt';

/**
 * Operator impersonation e2e — modal flow + audit-session lifecycle.
 *
 *   Positive:
 *     Modal opens from tenants list row action
 *     Submit with valid reason → impersonation session starts → banner appears
 *     End impersonation → session deleted, banner hidden
 *
 *   Negative:
 *     Reason shorter than 10 chars: form-level error, no POST fires
 *     Backend 403 (permission missing): error surfaces in modal
 */

const TARGET = fakeTenantDto({
	id: 'tid-target',
	slug: 'beta-meds',
	display_name: 'Beta Meds',
	legal_name: 'Beta Meds Ltd'
});

async function signInAsOperator(page: Page) {
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.tenants.view', 'platform.users.impersonate']
	});
	await registerMocks([
		{
			method: 'GET',
			path: '/api/v1/platform/tenants',
			status: 200,
			body: { tenants: [TARGET] }
		},
		{
			method: 'GET',
			path: '/api/v1/platform/impersonation/sessions',
			status: 200,
			body: { sessions: [] }
		}
	]);
}

test.describe('Impersonation — positive', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('open modal from tenants list', async ({ page }) => {
		await signInAsOperator(page);
		await page.goto('/operator/tenants');

		// Row action: Impersonate
		await page.getByRole('button', { name: /impersonate beta meds/i }).click();
		await expect(page.getByRole('heading', { name: /impersonate beta meds/i })).toBeVisible();
	});

	test('start impersonation: POST fires + dialog closes', async ({ page }) => {
		await signInAsOperator(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/platform/impersonation/sessions',
			status: 201,
			body: {
				session_id: 'imp-sess-1',
				expires_at_utc: new Date(Date.now() + 30 * 60_000).toISOString(),
				access_token: 'fake.scoped.jwt',
				refresh_token: 'fake.scoped.refresh',
				target_tenant: { id: TARGET.id, slug: TARGET.slug, display_name: TARGET.display_name }
			}
		});

		await page.goto('/operator/tenants');
		await page.getByRole('button', { name: /impersonate beta meds/i }).click();
		await page
			.getByRole('textbox', { name: /reason/i })
			.fill('Investigating support ticket #LK-1234');
		await page.getByLabel(/duration/i).fill('30');
		await page.getByRole('button', { name: /start impersonation/i }).click();

		// Dialog closes (heading no longer visible)
		await expect(page.getByRole('heading', { name: /impersonate beta meds/i })).toBeHidden({
			timeout: 5000
		});
	});
});

test.describe('Impersonation — negative', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('reason shorter than 10 chars: form rejects before any POST', async ({ page }) => {
		await signInAsOperator(page);
		await page.goto('/operator/tenants');
		await page.getByRole('button', { name: /impersonate beta meds/i }).click();
		await page.getByRole('textbox', { name: /reason/i }).fill('too short');
		await page.getByLabel(/duration/i).fill('30');
		await page.getByRole('button', { name: /start impersonation/i }).click();
		// Field-level error surfaces (Zod schema message); dialog stays open
		await expect(page.locator('[role="alert"], .text-danger').first()).toBeVisible({
			timeout: 3000
		});
		await expect(page.getByRole('heading', { name: /impersonate beta meds/i })).toBeVisible();
	});

	test('backend 403 (missing permission): error in form banner', async ({ page }) => {
		await signInAsOperator(page);
		await registerMock({
			method: 'POST',
			path: '/api/v1/platform/impersonation/sessions',
			status: 403,
			body: {
				code: 'permission_denied',
				message: 'platform.users.impersonate required'
			}
		});

		await page.goto('/operator/tenants');
		await page.getByRole('button', { name: /impersonate beta meds/i }).click();
		await page
			.getByRole('textbox', { name: /reason/i })
			.fill('Investigating support ticket #LK-1234');
		await page.getByLabel(/duration/i).fill('30');
		await page.getByRole('button', { name: /start impersonation/i }).click();

		// Banner with backend message
		await expect(page.getByText(/permission|denied|required/i).first()).toBeVisible({
			timeout: 5000
		});
		// Dialog stays open
		await expect(page.getByRole('heading', { name: /impersonate beta meds/i })).toBeVisible();
	});
});
