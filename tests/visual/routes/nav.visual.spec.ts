import { expect, test, type Page } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { SNAPSHOT_OPTIONS, setPreferencesCookie, stabilise } from '../fixtures/stability';
import type { Preferences } from '../../../src/lib/features/preferences/schema';
import { registerMocks } from '../../e2e/helpers/mock';
import { fakeTenantDto, TEST_TENANT_ID, TEST_TENANT_SLUG } from '../../e2e/helpers/fake-jwt';

/**
 * Visual regression: the navigation chrome (plan Task 30, "nav not screenshot-checked").
 *
 *   sidebar large / medium / small, horizontal nav with a section open, the mobile sheet open at 390px,
 *   and the tenant-context banner an operator sees inside a company.
 *
 * Viewport shots (not full page): the chrome is fixed to the viewport, and the glass layers are judged
 * over what scrolls behind them.
 */

const ADMIN = {
	tier: 'tenant-admin' as const,
	permissions: ['tenant.admin', 'identity.users.view', 'identity.roles.view']
};

async function open(page: Page, prefs: Partial<Preferences>, width: number, height = 800) {
	await page.setViewportSize({ width, height });
	await signInForVisual(page, {
		...ADMIN,
		mocks: [
			{
				method: 'GET',
				path: '/api/v1/users',
				status: 200,
				body: { users: [], has_more: false }
			},
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
		]
	});
	await setPreferencesCookie(page, prefs);
	await page.goto('/settings/users');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
}

async function shoot(page: Page, name: string) {
	await stabilise(page);
	await expect(page).toHaveScreenshot(`${name}.png`, { ...SNAPSHOT_OPTIONS });
}

test.describe('@visual nav', () => {
	for (const sidebar of ['large', 'medium', 'small'] as const) {
		test(`sidebar ${sidebar}`, async ({ page }) => {
			await open(page, { sidebar }, 1280);
			await shoot(page, `nav-sidebar-${sidebar}`);
		});
	}

	test('horizontal nav with a section open', async ({ page }) => {
		await open(page, { layout: 'horizontal' }, 1280);
		await page
			.getByRole('navigation', { name: 'Main navigation' })
			.locator('[data-slot="dropdown-menu-trigger"]')
			.first()
			.click();
		await expect(page.getByRole('menu')).toBeVisible();
		await shoot(page, 'nav-horizontal-section-open');
	});

	test('mobile sheet open (390px)', async ({ page }) => {
		await open(page, {}, 390, 844);
		await page.getByRole('button', { name: 'Toggle sidebar' }).click();
		const dialog = page.getByRole('dialog', { name: 'Navigation' });
		await expect(dialog).toBeVisible();
		await shoot(page, 'nav-mobile-sheet-open');
	});

	test('tenant-context banner', async ({ page }) => {
		const acme = fakeTenantDto({
			id: '00000000-0000-4000-8000-0000000000a1',
			slug: 'acme-pharma',
			display_name: 'Acme Pharma',
			legal_name: 'Acme Pharma Pvt Ltd'
		});
		await page.setViewportSize({ width: 1280, height: 800 });
		await signInForVisual(page, {
			tier: 'platform-super',
			permissions: ['platform.tenants.view', 'platform.tenants.manage'],
			is_super_user: true,
			tenant_id: TEST_TENANT_ID,
			tenant_slug: TEST_TENANT_SLUG,
			mocks: []
		});
		await registerMocks([
			{ method: 'GET', path: '/api/v1/platform/tenants', status: 200, body: { tenants: [acme] } },
			{ method: 'GET', path: `/api/v1/tenants/${acme.id}`, status: 200, body: acme },
			{ method: 'GET', path: '/api/v1/tenants', status: 200, body: { tenants: [acme] } },
			{ method: 'GET', path: '/api/v1/users', status: 200, body: { users: [], has_more: false } },
			{ method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } }
		]);
		await page.goto('/operator/tenants');
		await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
		await page.getByText('Acme Pharma').first().click();
		await page.waitForURL(/\/operator\/scope\/profile$/);
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('region', { name: 'Tenant context' })).toBeVisible();
		await shoot(page, 'nav-tenant-context-banner');
	});
});
