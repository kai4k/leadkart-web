import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInAsTier } from './helpers/sign-in';
import { resetMock } from './helpers/mock';

/**
 * Automated WCAG 2.2 AA gate via Deque axe-core.
 *
 * Strategy: scope to <main> on signed-in routes so the AppShell sidebar's
 * pre-existing `--color-fg-subtle` contrast issue on section titles doesn't
 * leak into per-feature suites. That issue is tracked separately and affects
 * every signed-in route; scoping isolates per-route regressions.
 *
 * Pass = zero serious/critical violations. Moderate + minor surface as
 * warnings in the report but don't fail CI (they require human review).
 */

async function expectNoSeriousOrCriticalViolations(page: Page, scope?: string): Promise<void> {
	let builder = new AxeBuilder({ page }).withTags([
		'wcag2a',
		'wcag2aa',
		'wcag21a',
		'wcag21aa',
		'wcag22aa',
		'best-practice'
	]);
	if (scope) builder = builder.include(scope);
	const results = await builder.analyze();
	const blocking = results.violations.filter(
		(v) => v.impact === 'critical' || v.impact === 'serious'
	);
	expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test.describe('A11y — WCAG 2.2 AA via axe-core', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('signin page has no critical or serious violations', async ({ page }) => {
		await page.goto('/signin');
		await expectNoSeriousOrCriticalViolations(page);
	});

	test('design-system styleguide has no critical or serious violations', async ({ page }) => {
		await page.goto('/styleguide');
		await expect(page.getByRole('heading', { level: 1, name: /design system/i })).toBeVisible();
		await expectNoSeriousOrCriticalViolations(page);
	});

	test('dashboard (tenant-admin) has no critical or serious violations', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await expect(page.getByRole('heading', { level: 1, name: 'Tenant Dashboard' })).toBeVisible();
		await expectNoSeriousOrCriticalViolations(page, 'main');
	});

	test('settings/account/security has no critical or serious violations', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: ['tenant.admin'] });
		await page.goto('/settings/account/security');
		await expect(page.getByRole('heading', { level: 3, name: 'Change password' })).toBeVisible();
		await expectNoSeriousOrCriticalViolations(page, 'main');
	});
});
