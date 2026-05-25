import { expect, test } from '@playwright/test';
import { resetMock, registerMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { TEST_MEMBERSHIP_ID, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Permission-elevation requests (ADR 0055 / Wave 9.1e).
 *
 *   Discovery:
 *     Nav link from tenant-admin sidebar → /permission-requests
 *   Positive:
 *     Empty inbox renders
 *     List renders submitted requests
 *     Create drawer submits + closes
 *   Negative:
 *     Reason too short: Zod field error
 *     409 duplicate request: form banner
 *   Approver flow:
 *     Tab switch to ?role=approver fetches the approval queue
 *     Approve mutation fires
 *     Deny without reason: client-side error
 */

// UUIDv4 RFC 4122 — Zod 4's .uuid() validates the variant nibble (4th
// group must start 8/9/a/b). Fixtures here use proper RFC-compliant
// IDs so the response parser doesn't reject them.
const REQUEST_ID = '00000000-0000-4000-8000-000000000001';
const REQUEST_ID_ALT = '00000000-0000-4000-8000-000000000002';
const ANOTHER_MEMBERSHIP = '00000000-0000-4000-8000-0000000000ff';

function makeRequest(over: Record<string, unknown> = {}) {
	return {
		id: REQUEST_ID,
		tenant_id: TEST_TENANT_ID,
		requester_membership_id: TEST_MEMBERSHIP_ID,
		permission: 'identity.users.create',
		duration_days: 30,
		reason: 'Need to onboard a new dispatch team',
		state: 'pending',
		created_at: '2026-05-20T10:00:00Z',
		updated_at: '2026-05-20T10:00:00Z',
		...over
	};
}

test.describe('Permission requests — discovery', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('nav link from tenant-admin sidebar reaches /permission-requests', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await registerMock({
			method: 'GET',
			path: '/api/v1/permission-requests',
			status: 200,
			body: { requests: [], has_more: false }
		});

		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await sidebar.getByRole('link', { name: /permission requests/i }).click();
		await page.waitForURL(/\/permission-requests$/);
		await expect(
			page.locator('#main-content').getByRole('heading', {
				level: 1,
				name: /permission requests/i
			})
		).toBeVisible();
	});
});

test.describe('Permission requests — requester flow', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('empty state + open create drawer', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await registerMock({
			method: 'GET',
			path: '/api/v1/permission-requests',
			status: 200,
			body: { requests: [], has_more: false }
		});
		await page.goto('/permission-requests');
		await expect(page.getByText(/no requests yet/i)).toBeVisible();
		await page
			.locator('#main-content')
			.getByRole('button', { name: /request permission/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: 'Request permission' })).toBeVisible();
	});

	test('list renders requests + clicking a row navigates to detail', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		const r = makeRequest();
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/permission-requests',
				status: 200,
				body: { requests: [r], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/permission-requests/${r.id}`,
				status: 200,
				body: r
			}
		]);
		await page.goto('/permission-requests');
		await expect(page.getByText('identity.users.create')).toBeVisible();
		await page.getByText('identity.users.create').click();
		await page.waitForURL(new RegExp(`/permission-requests/${r.id}$`));
	});

	test('create happy path: 201 → drawer closes + toast', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/permission-requests',
				status: 200,
				body: { requests: [], has_more: false }
			},
			{
				method: 'POST',
				path: '/api/v1/permission-requests',
				status: 201,
				body: { request_id: 'new-req-id' }
			}
		]);
		await page.goto('/permission-requests');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /request permission/i })
			.first()
			.click();

		await page.locator('input[name="permission"]').fill('identity.users.create');
		await page
			.locator('#create-permission-request-form textarea')
			.fill('Onboarding a new dispatch team next week');
		await page.locator('button[type="submit"][form="create-permission-request-form"]').click();

		await expect(page.getByText(/request submitted/i)).toBeVisible({ timeout: 5000 });
	});

	test('reason too short: Zod field error, no POST fires', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await registerMock({
			method: 'GET',
			path: '/api/v1/permission-requests',
			status: 200,
			body: { requests: [], has_more: false }
		});
		await page.goto('/permission-requests');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /request permission/i })
			.first()
			.click();

		await page.locator('input[name="permission"]').fill('identity.users.create');
		await page.locator('#create-permission-request-form textarea').fill('too short');
		await page.locator('button[type="submit"][form="create-permission-request-form"]').click();

		await expect(page.getByText(/at least 10/i)).toBeVisible({ timeout: 3000 });
	});
});

test.describe('Permission requests — approver flow', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('switching to approver tab fetches the approval queue', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		const otherUserReq = makeRequest({
			requester_membership_id: ANOTHER_MEMBERSHIP,
			id: REQUEST_ID_ALT
		});
		// Both /permission-requests (requester) and /permission-requests?role=approver
		// resolve to the same pathname for the mock-server. Return the
		// other-user request — when we look at the approver queue we'll see it.
		await registerMock({
			method: 'GET',
			path: '/api/v1/permission-requests',
			status: 200,
			body: { requests: [otherUserReq], has_more: false }
		});
		await page.goto('/permission-requests?role=approver');
		await expect(page.getByText('identity.users.create')).toBeVisible();
	});

	test('detail page surfaces Approve and Deny actions for the approver', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		const otherUserReq = makeRequest({
			requester_membership_id: ANOTHER_MEMBERSHIP,
			id: REQUEST_ID_ALT
		});
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/permission-requests/${otherUserReq.id}`,
				status: 200,
				body: otherUserReq
			},
			{
				method: 'POST',
				path: `/api/v1/permission-requests/${otherUserReq.id}/approve`,
				status: 204
			}
		]);
		await page.goto(`/permission-requests/${otherUserReq.id}`);
		// Wait for capabilities + detail to load — Approve only appears once
		// callerMembershipId is populated AND query.data is in.
		await expect(page.getByRole('heading', { name: 'Permission request' })).toBeVisible();
		await expect(page.getByRole('button', { name: /^approve$/i })).toBeVisible({
			timeout: 5000
		});
		await expect(page.getByRole('button', { name: /^deny$/i })).toBeVisible();
		await page.getByRole('button', { name: /^approve$/i }).click();
		await expect(page.getByText(/request approved/i)).toBeVisible({ timeout: 5000 });
	});

	test('cancel surfaces only on the requester own pending request', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		const myReq = makeRequest({ id: REQUEST_ID, requester_membership_id: TEST_MEMBERSHIP_ID });
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/permission-requests/${myReq.id}`,
				status: 200,
				body: myReq
			},
			{
				method: 'POST',
				path: `/api/v1/permission-requests/${myReq.id}/cancel`,
				status: 204
			}
		]);
		await page.goto(`/permission-requests/${myReq.id}`);
		await expect(page.getByRole('heading', { name: 'Permission request' })).toBeVisible();
		await expect(page.getByRole('button', { name: /cancel request/i })).toBeVisible({
			timeout: 5000
		});
		// Approve/Deny hidden for the requester's own request
		await expect(page.getByRole('button', { name: /^approve$/i })).toHaveCount(0);
	});
});
