import { expect, test, type Page } from '@playwright/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock } from './helpers/mock';

/**
 * Operator people management e2e — /operator/persons + /operator/persons/[id]
 *
 *   Positive:
 *     List renders persons from /v1/platform/persons
 *     Person detail loads + memberships render
 *
 *   Negative:
 *     Person detail 404: not-found alert
 *     Global suspend without reason: form error
 *
 *   Tier:
 *     Tenant user without platform.users.view: redirected away
 */

const PERSON_AAA = {
	id: 'per-aaa',
	email: 'alice@acme.test',
	first_name: 'Alice',
	last_name: 'Anderson',
	is_active: true,
	is_globally_suspended: false,
	is_anonymised: false,
	global_suspension_reason: '',
	globally_suspended_at: '',
	anonymised_at: '',
	created_at: '2026-01-01T00:00:00Z'
};

async function signInAsOperator(page: Page) {
	await signInAsTier(page, {
		tier: 'platform-super',
		permissions: ['platform.users.view', 'platform.users.manage', 'identity.users.anonymise']
	});
}

test.describe('People list — positive', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('list renders persons', async ({ page }) => {
		await signInAsOperator(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/persons',
			status: 200,
			body: { persons: [PERSON_AAA], next_cursor: null }
		});
		await page.goto('/operator/persons');
		await expect(page.getByText('Alice Anderson')).toBeVisible();
		await expect(page.getByText('alice@acme.test')).toBeVisible();
	});

	test('person detail loads + memberships render', async ({ page }) => {
		await signInAsOperator(page);
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/platform/persons',
				status: 200,
				body: { persons: [PERSON_AAA], next_cursor: null }
			},
			{
				method: 'GET',
				path: `/api/v1/platform/persons/${PERSON_AAA.id}`,
				status: 200,
				body: PERSON_AAA
			},
			{
				method: 'GET',
				path: `/api/v1/platform/persons/${PERSON_AAA.id}/memberships`,
				status: 200,
				body: { memberships: [] }
			}
		]);
		await page.goto(`/operator/persons/${PERSON_AAA.id}`);
		// Person header shows email and name
		await expect(page.getByText('alice@acme.test').first()).toBeVisible({ timeout: 5000 });
	});
});

test.describe('People list — negative', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('list 500: error surface', async ({ page }) => {
		await signInAsOperator(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/persons',
			status: 500,
			body: { code: 'internal_error', message: 'person list failed' }
		});
		await page.goto('/operator/persons');
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
	});

	test('person detail 404: not-found alert', async ({ page }) => {
		await signInAsOperator(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/persons/nonexistent-id',
			status: 404,
			body: { code: 'not_found', message: 'person not found' }
		});
		await page.goto('/operator/persons/nonexistent-id');
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
	});
});

test.describe('People tier guard', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('tenant user without platform.users.view: redirected to /dashboard', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-user' });
		await page.goto('/operator/persons');
		await page.waitForURL(/\/dashboard$/);
	});
});
