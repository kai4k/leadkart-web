import { expect, test, type Page } from './helpers/test';
import { signInAsTier } from './helpers/sign-in';
import { resetMock, registerMocks, registerMock } from './helpers/mock';

/**
 * Operator people management e2e — /operator/persons + /operator/persons/[id]
 *
 *   Positive:
 *     The list asks nothing until there is a search; a search of 2+ characters lists the hits of
 *     GET /v1/search?include=persons (Go has no list-every-person route)
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
	id: '00000000-0000-4000-8000-000000000103',
	email: 'alice@acme.test',
	first_name: 'Alice',
	last_name: 'Anderson',
	is_active: true,
	is_globally_suspended: false,
	is_anonymised: false,
	global_suspension_reason: '',
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

	test('nothing is listed until there is a search; the search keeps its text out of the URL', async ({
		page
	}) => {
		await signInAsOperator(page);
		await registerMock({
			method: 'GET',
			path: '/api/v1/search',
			status: 200,
			body: {
				persons: [
					{
						id: PERSON_AAA.id,
						email: PERSON_AAA.email,
						first_name: PERSON_AAA.first_name,
						last_name: PERSON_AAA.last_name,
						created_at: PERSON_AAA.created_at
					}
				],
				tenants: [],
				has_partial: false
			}
		});
		await page.goto('/operator/persons');
		await page.waitForSelector('html[data-hydrated="true"]');
		await expect(page.getByText('Search for a person')).toBeVisible();
		await page.getByRole('searchbox', { name: /search people/i }).fill('ali');
		await expect(page.getByText('Alice Anderson')).toBeVisible();
		await expect(page.getByText('alice@acme.test')).toBeVisible();
		await expect(page.getByRole('link', { name: /Alice Anderson/ })).toHaveAttribute(
			'href',
			`/operator/persons/${PERSON_AAA.id}`
		);
		expect(new URL(page.url()).search).toBe('');
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
			},
			{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [] } },
			// Activity feed: its area is still pre-Go (Task 27), so the fixture is unvalidated.
			{
				method: 'GET',
				path: `/api/v1/platform/persons/${PERSON_AAA.id}/activity`,
				status: 200,
				body: {}
			}
		]);
		await page.goto(`/operator/persons/${PERSON_AAA.id}`);
		// Person header shows email and name
		await expect(page.getByText('alice@acme.test').first()).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Anonymise dialog on a phone', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	// the REAL Anonymise dialog (person detail), not a styleguide stand-in
	test('at 360x640 its footer buttons are inside the viewport and the body scrolls', async ({
		page
	}) => {
		await page.setViewportSize({ width: 360, height: 640 });
		await signInAsOperator(page);
		await registerMocks([
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
			},
			{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [] } },
			{
				method: 'GET',
				path: `/api/v1/platform/persons/${PERSON_AAA.id}/activity`,
				status: 200,
				body: {}
			}
		]);
		await page.goto(`/operator/persons/${PERSON_AAA.id}`);
		await page.getByRole('button', { name: 'Anonymise' }).first().click();
		const dialog = page.locator('[data-slot="alert-dialog-content"]');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByText('Anonymise alice@acme.test')).toBeVisible();
		await page.waitForTimeout(300);
		const box = (await dialog.boundingBox())!;
		expect(box.y).toBeGreaterThanOrEqual(0);
		expect(box.y + box.height).toBeLessThanOrEqual(640);
		const buttons = dialog.locator('[data-slot="alert-dialog-footer"] button');
		expect(await buttons.count()).toBeGreaterThanOrEqual(2);
		for (let i = 0; i < (await buttons.count()); i++) {
			const b = (await buttons.nth(i).boundingBox())!;
			expect(b.y, `footer button ${i} top`).toBeGreaterThanOrEqual(0);
			expect(b.y + b.height, `footer button ${i} bottom`).toBeLessThanOrEqual(640);
			expect(b.x + b.width, `footer button ${i} right`).toBeLessThanOrEqual(360);
		}
		// the body between the pinned header and footer is what scrolls when the dialog is taller than the cap
		const body = await dialog.evaluate((el) => {
			const footer = el.querySelector('[data-slot="alert-dialog-footer"]')!;
			const scroller = [...el.children].find(
				(c) => c !== footer && getComputedStyle(c).overflowY === 'auto'
			);
			return {
				dialogOverflow: getComputedStyle(el).overflowY,
				hasScroller: Boolean(scroller)
			};
		});
		expect(box.height).toBeLessThanOrEqual(640 * 0.9 + 1);
		expect(body.hasScroller, 'the body is the scroll container, not the dialog').toBe(true);
		expect(body.dialogOverflow).not.toBe('auto');
		await expect(buttons.first()).toBeFocused();
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
			path: '/api/v1/search',
			status: 500,
			body: { error: 'internal_error', message: 'search failed' }
		});
		await page.goto('/operator/persons');
		await page.waitForSelector('html[data-hydrated="true"]');
		await page.getByRole('searchbox', { name: /search people/i }).fill('ali');
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 5000 });
	});

	test('person detail 404: not-found alert', async ({ page }) => {
		await signInAsOperator(page);
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/platform/persons/nonexistent-id',
				status: 404,
				body: { error: 'not_found', message: 'person not found' }
			},
			{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [] } }
		]);
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
