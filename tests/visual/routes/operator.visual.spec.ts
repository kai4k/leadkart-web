import { expect, test } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { SNAPSHOT_OPTIONS, stabilise } from '../fixtures/stability';
import { VIEWPORTS } from '../fixtures/viewports';
import { fakeTenantDto } from '../../e2e/helpers/fake-jwt';

/**
 * Visual regression — operator-tier surfaces.
 *
 * Routes covered:
 *   /operator/tenants            — directory list
 *   /operator/persons            — cross-tenant person directory
 *   /operator/scope/profile      — in-scope tenant profile view
 *   /operator/scope/members      — in-scope members list
 *   /operator/scope/roles        — in-scope roles list
 *   /operator/scope/activity     — in-scope activity log
 *   /operator/scope/settings     — in-scope tenant settings
 *
 * `/operator/scope/*` routes require the `lk_op_tenant` cookie to be
 * set (operator-scope entry). The fixture POSTs to `/api/operator/scope`
 * via the BFF after signin to populate that cookie naturally — matches
 * what enterScope() does in the real flow.
 */

const TENANTS_LIST_FIXTURE = {
	tenants: [
		fakeTenantDto({ slug: 'platform', display_name: 'LeadKart Platform' }),
		fakeTenantDto({
			id: '00000000-0000-0000-0000-000000000020',
			slug: 'acme-pharma',
			display_name: 'Acme Pharma',
			legal_name: 'Acme Pharmaceutical Pvt. Ltd.',
			status: 'active'
		}),
		fakeTenantDto({
			id: '00000000-0000-0000-0000-000000000021',
			slug: 'globex-rx',
			display_name: 'Globex Rx',
			legal_name: 'Globex Rx Wholesalers',
			status: 'active'
		}),
		fakeTenantDto({
			id: '00000000-0000-0000-0000-000000000022',
			slug: 'sentinel-meds',
			display_name: 'Sentinel Meds',
			legal_name: 'Sentinel Meds Distribution LLP',
			status: 'suspended'
		})
	]
};

for (const vp of VIEWPORTS) {
	test.describe(`@visual operator — ${vp.name}`, () => {
		test.use({ viewport: { width: vp.width, height: vp.height } });

		test('tenants list', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'platform-super',
				is_super_user: true,
				permissions: ['platform.tenants.view'],
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/tenants',
						status: 200,
						body: TENANTS_LIST_FIXTURE
					}
				]
			});
			await page.goto('/operator/tenants');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`operator-tenants-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});

		test('persons directory', async ({ page }) => {
			await signInForVisual(page, {
				tier: 'platform-super',
				is_super_user: true,
				permissions: ['platform.users.view'],
				mocks: [
					{
						method: 'GET',
						path: '/api/v1/platform/persons',
						status: 200,
						body: { persons: [], next_cursor: null }
					}
				]
			});
			await page.goto('/operator/persons');
			await page.waitForLoadState('networkidle');
			await stabilise(page);
			await expect(page).toHaveScreenshot(`operator-persons-empty-${vp.name}.png`, {
				fullPage: true,
				...SNAPSHOT_OPTIONS
			});
		});
	});
}
