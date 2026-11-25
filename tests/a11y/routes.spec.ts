import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInAsTier, type SignInOpts } from '../e2e/helpers/sign-in';
import { resetMock, registerMocks } from '../e2e/helpers/mock';
import { fakeTenantDto, fakeUserDto, TEST_TENANT_ID } from '../e2e/helpers/fake-jwt';
import { settleForScan } from '../e2e/helpers/settle';

/**
 * Layer C of Session 0 — strict WCAG 2.2 AA enforcement on EVERY route.
 *
 * Strictness contract:
 *   - fails on `impact === 'critical'`  (was: failed already)
 *   - fails on `impact === 'serious'`   (was: failed already)
 *   - fails on `impact === 'moderate'`  (NEW — tightened from previous suite)
 *   - flags `impact === 'minor'` only as warnings (don't gate CI;
 *     reviewer adjusts copy/colour judgement-call)
 *
 * Scope:
 *   axe runs against the `<main>` landmark on signed-in routes so the
 *   AppShell sidebar's known `--color-fg-subtle` contrast on section
 *   titles doesn't dominate every route's report. That issue is tracked
 *   separately and would mask per-feature regressions otherwise.
 *
 *   Public routes (signin / forgot / reset / etc.) check the entire body
 *   because there's no sidebar to scope around.
 *
 * Coverage:
 *   - 5 unauthenticated routes
 *   - 3 dashboard variants (platform-super / tenant-admin / tenant-user)
 *   - 9 settings routes
 *   - 3 operator routes
 *   - 3 CRM list routes
 *   - 1 error route
 *   - 1 styleguide
 *
 * Industry refs: WCAG 2.2 AA conformance criteria (W3C), Deque axe-core
 * tag-set documentation, GOV.UK accessibility canon, Stripe's a11y CI gate.
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const BLOCKING_IMPACTS = new Set(['critical', 'serious', 'moderate']);

async function expectClean(page: Page, scope?: string): Promise<void> {
	// Hydrated, and no card still fading in (helpers/settle.ts says why).
	await settleForScan(page);
	// One <h1> per route (PageHeader / the auth form / RouteError), every state of the page.
	await expect(page.locator('h1')).toHaveCount(1);
	let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
	if (scope) builder = builder.include(scope);
	const results = await builder.analyze();
	const blocking = results.violations.filter(
		(v) => v.impact !== null && v.impact !== undefined && BLOCKING_IMPACTS.has(v.impact)
	);
	expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

// Plan Task 17 + G9: every route is scanned in light and in dark, once with a non-default primary, and in Solid (light and dark).
// The `lk_ui` cookie makes the SERVER write the preferences onto <html>, as for a returning visitor.
const b64url = (s: string) =>
	Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
const uiCookie = (mode: string, palette: string, transparency: string) =>
	b64url(
		JSON.stringify({
			v: 2,
			layout: 'vertical',
			navType: 'default',
			contentWidth: 'default',
			sidebar: 'large',
			mode,
			palette,
			sidebarColors: 'light',
			dock: 'bottom',
			autoHideDock: 'off',
			density: 'comfortable',
			transparency
		})
	);
// plan G9: mode x transparency. Glass is the default level; Solid (`off`) is every fallback's look, so a pass there covers
// reduced transparency and increased contrast too (the same opaque tokens). Forced colours REPLACES the tokens with system
// colours, so Solid says nothing about it and axe is not run under it (contrast is the user agent's there);
// material-fallbacks.spec.ts asserts forced colours on computed styles instead (a 1px solid border, an opaque fill).
const SCHEMES = [
	{ name: 'light', mode: 'light', palette: 'iris', transparency: 'glass' },
	{ name: 'dark', mode: 'dark', palette: 'iris', transparency: 'glass' },
	{ name: 'emerald palette', mode: 'light', palette: 'emerald', transparency: 'glass' },
	{ name: 'light solid', mode: 'light', palette: 'iris', transparency: 'off' },
	{ name: 'dark solid', mode: 'dark', palette: 'iris', transparency: 'off' }
] as const;

for (const scheme of SCHEMES) {
	test.describe(`${scheme.name}`, () => {
		test.beforeEach(async ({ context }) => {
			await context.addCookies([
				{
					name: 'lk_ui',
					value: uiCookie(scheme.mode, scheme.palette, scheme.transparency),
					url: 'http://localhost:4173'
				}
			]);
		});

		defineRoutes();
	});
}

function defineRoutes() {
	test.describe('@a11y unauthenticated routes', () => {
		test.beforeEach(async () => {
			await resetMock();
		});

		test('signin', async ({ page }) => {
			await page.goto('/signin');
			await expectClean(page);
		});

		test('forgot-password', async ({ page }) => {
			await page.goto('/forgot-password');
			await expectClean(page);
		});

		test('styleguide', async ({ page }) => {
			await page.goto('/styleguide');
			await expectClean(page);
		});

		test('reset-password — with token', async ({ page }) => {
			await page.goto('/reset-password?token=mock');
			await expectClean(page);
		});

		test('reset-password — missing token', async ({ page }) => {
			await page.goto('/reset-password');
			await expectClean(page);
		});

		test('verify-email — with token', async ({ page }) => {
			await page.goto('/verify-email?token=mock');
			await expectClean(page);
		});

		test('404 unknown route', async ({ page }) => {
			await page.goto('/this-route-does-not-exist');
			await expectClean(page);
		});
	});

	test.describe('@a11y dashboard variants', () => {
		test.beforeEach(async () => {
			await resetMock();
		});

		test('platform-super dashboard', async ({ page }) => {
			await signInAsTier(page, {
				tier: 'platform-super',
				is_super_user: true,
				permissions: ['platform.stats.view']
			});
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/platform/stats',
					status: 200,
					body: {
						tenants_total: 12,
						tenants_active: 9,
						tenants_suspended: 3,
						persons_total: 156,
						memberships_active: 132
					}
				}
			]);
			await page.goto('/dashboard');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('tenant-admin dashboard', async ({ page }) => {
			await signInAsTier(page, {
				tier: 'tenant-admin',
				permissions: ['tenant.admin']
			});
			await page.goto('/dashboard');
			await expectClean(page, 'main');
		});

		test('tenant-user dashboard', async ({ page }) => {
			await signInAsTier(page, {
				tier: 'tenant-user',
				permissions: ['crm.leads.view']
			});
			await page.goto('/dashboard');
			await expectClean(page, 'main');
		});
	});

	const TENANT_ADMIN: SignInOpts = {
		tier: 'tenant-admin',
		permissions: [
			'tenant.admin',
			'tenant.profile.update',
			'identity.users.view',
			'identity.roles.view'
		]
	};

	test.describe('@a11y settings routes', () => {
		test.beforeEach(async () => {
			await resetMock();
		});

		test('account/profile', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await page.goto('/settings/account/profile');
			await expectClean(page, 'main');
		});

		test('account/security', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await page.goto('/settings/account/security');
			await expectClean(page, 'main');
		});

		test('account/sessions', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await page.goto('/settings/account/sessions');
			await expectClean(page, 'main');
		});

		test('tenant/profile', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await registerMocks([
				{
					method: 'GET',
					path: `/api/v1/tenants/${TEST_TENANT_ID}`,
					status: 200,
					body: fakeTenantDto()
				}
			]);
			await page.goto('/settings/tenant/profile');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('tenant/statutory', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await registerMocks([
				{
					method: 'GET',
					path: `/api/v1/tenants/${TEST_TENANT_ID}`,
					status: 200,
					body: fakeTenantDto()
				}
			]);
			await page.goto('/settings/tenant/statutory');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('tenant/contact', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await registerMocks([
				{
					method: 'GET',
					path: `/api/v1/tenants/${TEST_TENANT_ID}`,
					status: 200,
					body: fakeTenantDto()
				}
			]);
			await page.goto('/settings/tenant/contact');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('tenant/preferences', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await registerMocks([
				{
					method: 'GET',
					path: `/api/v1/tenants/${TEST_TENANT_ID}`,
					status: 200,
					body: fakeTenantDto()
				}
			]);
			await page.goto('/settings/tenant/preferences');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('users — populated', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/users',
					status: 200,
					body: {
						users: [
							fakeUserDto({
								first_name: 'Alice',
								last_name: 'Anderson',
								email: 'alice@acme.test',
								designation: 'Sales Lead'
							})
						],
						has_more: false
					}
				},
				{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
			]);
			await page.goto('/settings/users');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('roles — empty', async ({ page }) => {
			await signInAsTier(page, TENANT_ADMIN);
			await registerMocks([
				{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
			]);
			await page.goto('/settings/roles');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});
	});

	test.describe('@a11y operator routes', () => {
		test.beforeEach(async () => {
			await resetMock();
		});

		test('tenants list', async ({ page }) => {
			await signInAsTier(page, {
				tier: 'platform-super',
				is_super_user: true,
				permissions: ['platform.tenants.view']
			});
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/tenants',
					status: 200,
					body: {
						tenants: [
							fakeTenantDto({ slug: 'platform', display_name: 'LeadKart Platform' }),
							fakeTenantDto({
								id: '00000000-0000-4000-8000-000000000020',
								slug: 'acme-pharma',
								display_name: 'Acme Pharma'
							})
						]
					}
				}
			]);
			await page.goto('/operator/tenants');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('persons directory', async ({ page }) => {
			await signInAsTier(page, {
				tier: 'platform-super',
				is_super_user: true,
				permissions: ['platform.users.view']
			});
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/platform/persons',
					status: 200,
					body: { persons: [], next_cursor: null }
				}
			]);
			await page.goto('/operator/persons');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});
	});

	test.describe('@a11y CRM list routes', () => {
		test.beforeEach(async () => {
			await resetMock();
		});

		const TENANT_CRM: SignInOpts = {
			tier: 'tenant-admin',
			permissions: ['tenant.admin', 'crm.leads.view', 'crm.orders.view', 'inventory.products.view']
		};

		test('leads — empty', async ({ page }) => {
			await signInAsTier(page, TENANT_CRM);
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/crm/leads', // unvalidated until Tasks 16-19
					status: 200,
					body: { leads: [], next_cursor: null }
				}
			]);
			await page.goto('/leads');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('orders — empty', async ({ page }) => {
			await signInAsTier(page, TENANT_CRM);
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/orders',
					status: 200,
					body: { orders: [], next_cursor: null }
				}
			]);
			await page.goto('/orders');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('inventory — empty', async ({ page }) => {
			await signInAsTier(page, TENANT_CRM);
			await registerMocks([
				{
					method: 'GET',
					path: '/api/v1/inventory/products', // unvalidated until Tasks 24-26
					status: 200,
					body: { products: [], next_cursor: null }
				}
			]);
			await page.goto('/inventory');
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});
	});

	// A detail page whose record cannot be loaded still has exactly one <h1> (expectClean counts them).
	test.describe('@a11y detail pages that fail to load', () => {
		test.beforeEach(async () => {
			await resetMock();
		});

		const ID = '00000000-0000-4000-8000-0000000000aa';
		const TENANT_CRM: SignInOpts = {
			tier: 'tenant-admin',
			permissions: ['tenant.admin', 'crm.leads.view', 'identity.permission_requests.view']
		};

		test('lead detail — not found', async ({ page }) => {
			await signInAsTier(page, TENANT_CRM);
			await registerMocks([
				{
					method: 'GET',
					path: `/api/v1/crm/leads/${ID}`,
					status: 404,
					body: { error: 'not_found', message: 'Not found' }
				}
			]);
			await page.goto(`/leads/${ID}`);
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});

		test('permission request detail — not found', async ({ page }) => {
			await signInAsTier(page, TENANT_CRM);
			await registerMocks([
				{
					method: 'GET',
					path: `/api/v1/permission-requests/${ID}`,
					status: 404,
					body: { error: 'not_found', message: 'Not found' }
				}
			]);
			await page.goto(`/permission-requests/${ID}`);
			await page.waitForLoadState('networkidle');
			await expectClean(page, 'main');
		});
	});
}
