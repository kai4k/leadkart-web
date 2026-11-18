import { expect, test, type Page } from '@playwright/test';
import { registerMock, registerMocks, resetMock } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import {
	fakeTenantDto,
	TEST_MEMBERSHIP_ID,
	TEST_TENANT_ID,
	TEST_TENANT_SLUG
} from './helpers/fake-jwt';

/**
 * Security headers + CSP. Any CSP refusal (console message, pageerror, or a
 * `securitypolicyviolation` DOM event) fails the test. Fix the violation's
 * source; never loosen script-src.
 */

const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const LEAD = {
	id: LEAD_ID,
	tenant_id: TEST_TENANT_ID,
	platform_lead_id: '00000000-0000-4000-8000-0000000000ff',
	purchased_at: '2026-05-01T10:00:00Z',
	contact_name: 'Mahesh Pharma',
	mobile_number: '+919876543210',
	email: 'contact@maheshpharma.in',
	address: {
		pin_code: '400001',
		city: 'Mumbai',
		district: 'Mumbai',
		state: 'Maharashtra',
		street: 'Shop 12, Main Bazar'
	},
	has_drug_licence: true,
	has_gst: true,
	gst_number: '27AAAAA0000A1Z5',
	gst_verified: true,
	has_pan: true,
	pan_number: 'AAAAA1234A',
	business_type: 'pcd',
	medicine_system: 'allopathic',
	product_ranges: ['Antibiotics'],
	dosage_forms: ['Tablet'],
	order_value_band: 'upto_25000',
	buy_timeline: 'within_15_days',
	stage: 'new',
	temperature: 'warm',
	last_contacted_at: '2026-05-20T10:00:00Z',
	next_followup_at: null,
	owner_membership_id: '00000000-0000-4000-8000-0000000000bb',
	notes: null,
	created_at: '2026-05-01T10:00:00Z',
	updated_at: '2026-05-20T10:00:00Z'
};

const ROLE = {
	id: 'role-custom',
	tenant_id: TEST_TENANT_ID,
	name: 'Sales Lead',
	hierarchy_level: 5,
	permissions: ['crm.leads.view'],
	is_system_default: false,
	is_super_admin: false,
	created_at: '2026-01-01T00:00:00Z'
};

const PERMS = [
	'tenant.admin',
	'crm.leads.view',
	'crm.leads.update',
	'crm.orders.view',
	'crm.inventory.view',
	'identity.roles.view',
	'identity.roles.update',
	'identity.roles.delete',
	'identity.users.view'
];

const EMPTY_PAGE = { items: [], has_more: false };

/**
 * Collects every CSP violation signal for a page. The DOM listener reports
 * through an exposed binding, so a violation fired right before a navigation
 * is not lost with the old document.
 */
async function watchViolations(page: Page) {
	const violations: string[] = [];
	page.on('console', (msg) => {
		if (/Content Security Policy|Refused to|violates the following/i.test(msg.text())) {
			violations.push(`console: ${msg.text()}`);
		}
	});
	page.on('pageerror', (err) => violations.push(`pageerror: ${err.message}`));
	await page.exposeFunction('__lkCsp', (v: string) => violations.push(`dom: ${v}`));
	await page.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (e) => {
			(window as unknown as { __lkCsp: (v: string) => void }).__lkCsp(
				`${e.disposition} ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile ?? ''}:${e.lineNumber ?? ''}`
			);
		});
	});
	return {
		violations,
		/**
		 * Wait for hydration (the root layout's marker), let the browser flush one
		 * frame (a violation raised by an in-page interaction is reported
		 * asynchronously), then assert none were recorded.
		 */
		async assertClean(label: string) {
			await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
			await page.evaluate(() => new Promise(requestAnimationFrame));
			await page.waitForLoadState('networkidle');
			expect(violations, `CSP violations on ${label}`).toEqual([]);
		}
	};
}

test.describe('security headers + CSP', () => {
	let watcher: Awaited<ReturnType<typeof watchViolations>> | undefined;

	test.beforeEach(async () => {
		watcher = undefined;
		await resetMock();
	});

	// Final sweep: anything fired after the last in-test assertion still fails the test.
	test.afterEach(async () => {
		await watcher?.assertClean('end of test');
	});

	test('the collector records a deliberate violation (not vacuous)', async ({ page }) => {
		const { violations } = (watcher = await watchViolations(page));
		await page.goto('/signin');
		await page.evaluate(() => {
			const s = document.createElement('script');
			s.textContent = 'window.__x = 1';
			document.head.appendChild(s);
		});
		await expect.poll(() => violations.join('; ')).toMatch(/enforce script-src/);
		violations.length = 0; // expected; keep afterEach from failing this test
	});

	test('signed-out pages send security headers and a CSP, with no violations', async ({ page }) => {
		const { assertClean } = (watcher = await watchViolations(page));
		const response = await page.goto('/signin');
		const headers = response!.headers();
		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['x-frame-options']).toBe('DENY');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
		const csp = headers['content-security-policy'];
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("script-src 'self'");
		expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
		await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
		await assertClean('/signin');

		await page.goto('/forgot-password');
		await expect(page.locator('form')).toBeVisible();
		await assertClean('/forgot-password');
	});

	test('a signed-out request is redirected with the security headers on the 303', async ({
		request
	}) => {
		const response = await request.get('/dashboard', { maxRedirects: 0 });
		expect(response.status()).toBe(303);
		expect(response.headers()['x-content-type-options']).toBe('nosniff');
		expect(response.headers()['x-frame-options']).toBe('DENY');
	});

	test('tenant-admin app pages and overlays raise no violations', async ({ page }) => {
		const { assertClean } = (watcher = await watchViolations(page));
		await signInAsTier(page, { tier: 'tenant-admin', permissions: PERMS });
		await registerMocks([
			{
				method: 'GET',
				path: '/api/v1/crm/leads',
				status: 200,
				body: { ...EMPTY_PAGE, items: [LEAD] }
			},
			{ method: 'GET', path: `/api/v1/crm/leads/${LEAD_ID}`, status: 200, body: LEAD },
			{ method: 'GET', path: `/api/v1/crm/leads/${LEAD_ID}/calls`, status: 200, body: EMPTY_PAGE },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${LEAD_ID}/reminders`,
				status: 200,
				body: EMPTY_PAGE
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${LEAD_ID}/history`,
				status: 200,
				body: EMPTY_PAGE
			},
			{
				method: 'POST',
				path: `/api/v1/crm/leads/${LEAD_ID}/calls`,
				status: 201,
				body: {
					id: '00000000-0000-4000-8000-000000000aaa',
					lead_id: LEAD_ID,
					called_at: '2026-05-24T10:00:00Z',
					outcome: 'connected',
					notes: null,
					callback_at: null,
					callback_window_minutes: null,
					logged_by_membership_id: TEST_MEMBERSHIP_ID,
					created_at: '2026-05-24T10:00:00Z'
				}
			},
			{ method: 'GET', path: '/api/v1/orders', status: 200, body: EMPTY_PAGE },
			{ method: 'GET', path: '/api/v1/inventory/products', status: 200, body: EMPTY_PAGE },
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [ROLE] } },
			{ method: 'GET', path: `/api/v1/roles/${ROLE.id}`, status: 200, body: ROLE },
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [] } }
		]);

		// signInAsTier already landed on /dashboard; reload to read its headers.
		const appResponse = await page.goto('/dashboard');
		expect(appResponse!.headers()['content-security-policy']).toContain("script-src 'self'");
		expect(appResponse!.headers()['x-frame-options']).toBe('DENY');
		expect(appResponse!.headers()['cache-control']).toBe('private, no-store');
		await assertClean('/dashboard');

		for (const path of [
			'/leads',
			`/leads/${LEAD_ID}`,
			'/orders',
			'/inventory',
			'/settings/account/profile',
			'/settings/roles',
			`/settings/roles/${ROLE.id}`
		]) {
			await page.goto(path);
			await expect(page.locator('#main-content')).toBeVisible();
			await assertClean(path);
		}

		// Dialog + toast: log a call from the lead detail page.
		await page.goto(`/leads/${LEAD_ID}`);
		await page.getByRole('tab', { name: 'Activity' }).click();
		await page.getByRole('button', { name: /log call/i }).click();
		await expect(page.getByRole('heading', { name: 'Log call' })).toBeVisible();
		await assertClean('log-call dialog');
		await page.locator('button[type="submit"][form="log-call-form"]').click();
		await expect(page.getByText(/call logged/i)).toBeVisible({ timeout: 5000 });
		await assertClean('toast');

		// Dropdown menu: roles row actions.
		await page.goto('/settings/roles');
		await page
			.locator('tr:has-text("Sales Lead") button[aria-label="Row actions"]')
			.first()
			.click();
		await expect(page.getByText('Delete', { exact: true })).toBeVisible();
		await assertClean('dropdown menu');
	});

	test('operator pages and command palette raise no violations', async ({ page }) => {
		const { assertClean } = (watcher = await watchViolations(page));
		const acme = fakeTenantDto({
			id: '00000000-0000-4000-8000-0000000000a1',
			slug: 'acme-pharma',
			display_name: 'Acme Pharma',
			legal_name: 'Acme Pharma Pvt Ltd'
		});
		await signInAsTier(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view', 'platform.tenants.create', 'platform.tenants.manage'],
			is_super_user: true,
			tenant_id: TEST_TENANT_ID,
			tenant_slug: TEST_TENANT_SLUG
		});
		await registerMock({
			method: 'GET',
			path: '/api/v1/platform/tenants',
			status: 200,
			body: { tenants: [acme] }
		});
		await page.goto('/operator/tenants');
		await expect(page.locator('#main-content')).toBeVisible();
		await assertClean('/operator/tenants');

		// The trigger is server-rendered, so seeing it proves nothing about hydration;
		// the Ctrl+K handler attaches only once the page has hydrated.
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await expect(page.getByRole('button', { name: 'Search (Cmd+K)', exact: true })).toBeVisible();
		await page.keyboard.press('Control+k');
		await expect(page.getByRole('dialog')).toBeVisible();
		await assertClean('command palette');
	});
});
