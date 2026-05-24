import { expect, test, type Page } from '@playwright/test';
import { resetMock, registerMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { TEST_MEMBERSHIP_ID, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * CRM Leads e2e — /leads
 *
 *   Discovery:
 *     Nav link from tenant-admin sidebar → /leads
 *   List views:
 *     Kanban default → 6 BRD columns visible
 *     Kanban drag (keyboard) → PATCH + toast
 *     Switch to table view → infinite list sentinel
 *     Inline stage change from table row → PATCH
 *     Filter: stage=interested → URL ?stage=interested
 *     Saved view "Hot leads" → URL ?temperature=hot
 *   Detail:
 *     Tabs: Profile / Activity / Reminders / History
 *     Log call dialog → POST /calls + toast
 *     Reassign dialog → reason required, POST /reassign + toast
 *   Bulk:
 *     Bulk select 2 → bulk-action bar visible → Change stage POSTs bulk-action
 *     Bulk upload preview + commit happy path
 *   Validation:
 *     Reassign with no membership id → field error, no POST
 */

// RFC-4122 v4 UUIDs (variant nibble 8/9/a/b on the 4th group).
const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const LEAD_ID_2 = '00000000-0000-4000-8000-000000000002';
const OWNER_MEMBERSHIP = '00000000-0000-4000-8000-0000000000bb';
const NEW_OWNER = '00000000-0000-4000-8000-0000000000cc';

const LEAD_PERMS = [
	'tenant.admin',
	'crm.leads.view',
	'crm.leads.update',
	'crm.leads.reassign',
	'crm.leads.bulk_upload'
];

function makeLead(over: Record<string, unknown> = {}) {
	return {
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
		owner_membership_id: OWNER_MEMBERSHIP,
		notes: null,
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-20T10:00:00Z',
		...over
	};
}

async function signInAndPrime(
	page: Page,
	leads: ReturnType<typeof makeLead>[] = []
): Promise<void> {
	await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
	await registerMock({
		method: 'GET',
		path: '/api/v1/crm/leads',
		status: 200,
		body: { items: leads, has_more: false }
	});
}

test.describe('CRM Leads — discovery', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('nav link from tenant-admin sidebar reaches /leads', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/crm/leads',
			status: 200,
			body: { items: [], has_more: false }
		});
		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await sidebar.getByRole('link', { name: /leads/i }).click();
		await page.waitForURL(/\/leads$/);
		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: 'Leads' })
		).toBeVisible();
	});
});

test.describe('CRM Leads — kanban view (default)', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('renders six BRD stage columns', async ({ page }) => {
		await signInAndPrime(page, [makeLead()]);
		await page.goto('/leads');
		await expect(page.locator(`[data-kanban-card="${LEAD_ID}"]`)).toBeVisible({
			timeout: 5000
		});

		for (const label of ['New', 'Contacted', 'Interested', 'Negotiation', 'Converted', 'Lost']) {
			await expect(
				page.locator('[data-kanban-board]').locator('header').getByText(label, { exact: true })
			).toBeVisible();
		}
	});

	test('keyboard drag (ArrowRight) moves a card to the next stage + toasts', async ({ page }) => {
		await signInAndPrime(page, [makeLead({ stage: 'new' })]);
		await registerMock({
			method: 'PATCH',
			path: `/api/v1/crm/leads/${LEAD_ID}`,
			status: 200,
			body: makeLead({ stage: 'contacted' })
		});
		await page.goto('/leads');

		await expect(page.locator(`[data-kanban-card="${LEAD_ID}"]`)).toBeVisible({ timeout: 5000 });
		await page.locator(`[data-kanban-card="${LEAD_ID}"]`).focus();
		await page.keyboard.press('ArrowRight');

		await expect(page.getByText(/stage changed/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('CRM Leads — table view', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('switching to table view renders the table grid', async ({ page }) => {
		await signInAndPrime(page, [makeLead()]);
		await page.goto('/leads?view=table');
		await expect(page.getByTestId('leads-table')).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId('leads-table').getByText('Mahesh Pharma')).toBeVisible();
	});

	test('inline stage change from table row fires PATCH + toast', async ({ page }) => {
		await signInAndPrime(page, [makeLead({ stage: 'new' })]);
		await registerMock({
			method: 'PATCH',
			path: `/api/v1/crm/leads/${LEAD_ID}`,
			status: 200,
			body: makeLead({ stage: 'interested' })
		});
		await page.goto('/leads?view=table');

		// StatusPill trigger button — accessible name set to "Status: ...".
		const stagePill = page
			.locator(`[data-lead-id="${LEAD_ID}"]`)
			.getByRole('button', { name: /status: new/i });
		await stagePill.click();
		// Click the Interested menuitem from the dropdown.
		await page.getByRole('menuitem', { name: /interested/i }).click();
		await expect(page.getByText(/stage changed/i)).toBeVisible({ timeout: 5000 });
	});

	test('clicking a row navigates to /leads/[id]', async ({ page }) => {
		const lead = makeLead();
		await signInAndPrime(page, [lead]);
		await registerMock({
			method: 'GET',
			path: `/api/v1/crm/leads/${lead.id}`,
			status: 200,
			body: lead
		});
		await page.goto('/leads?view=table');
		await page.getByTestId('leads-table').getByText('Mahesh Pharma').click();
		await page.waitForURL(new RegExp(`/leads/${lead.id}$`));
	});
});

test.describe('CRM Leads — filters + saved views', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('selecting a stage in the filter bar updates the URL', async ({ page }) => {
		await signInAndPrime(page, [makeLead({ stage: 'interested' })]);
		await page.goto('/leads');

		// FilterBar starts collapsed — click "Show filters" first.
		await page.getByRole('button', { name: /show filters/i }).click();

		// The multi-select for "Stage" is a native <select multiple>.
		const stageSelect = page.locator('#filterbar-stage');
		await stageSelect.selectOption(['interested']);
		await page.waitForURL(/stage=interested/);
	});

	test('saved view "Hot leads" sets ?temperature=hot', async ({ page }) => {
		await signInAndPrime(page, [makeLead({ temperature: 'hot' })]);
		await page.goto('/leads');

		await page.getByRole('button', { name: /^hot leads$/i }).click();
		await page.waitForURL(/temperature=hot/);
	});
});

test.describe('CRM Leads — bulk select + bulk actions', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('selecting two rows surfaces the bulk action bar', async ({ page }) => {
		const leads = [
			makeLead({ id: LEAD_ID, contact_name: 'Lead A' }),
			makeLead({ id: LEAD_ID_2, contact_name: 'Lead B' })
		];
		await signInAndPrime(page, leads);
		await page.goto('/leads?view=table');

		await expect(page.getByTestId('leads-table').getByText('Lead A')).toBeVisible();
		await page.getByLabel('Select Lead A').check();
		await page.getByLabel('Select Lead B').check();

		await expect(page.getByText('2 selected')).toBeVisible({ timeout: 5000 });
	});

	test('change stage bulk action POSTs /v1/crm/leads/bulk-action', async ({ page }) => {
		const leads = [
			makeLead({ id: LEAD_ID, contact_name: 'Lead A' }),
			makeLead({ id: LEAD_ID_2, contact_name: 'Lead B' })
		];
		await signInAndPrime(page, leads);
		await registerMock({
			method: 'POST',
			path: '/api/v1/crm/leads/bulk-action',
			status: 200,
			body: { affected: 2, errors: [] }
		});
		await page.goto('/leads?view=table');

		await page.getByLabel('Select Lead A').check();
		await page.getByLabel('Select Lead B').check();
		// "Change stage" is now a Dropdown.Trigger — open it, pick "Contacted".
		// The trigger button carries `aria-haspopup="menu"` so we filter on
		// that to disambiguate from any literal "Change stage" labels.
		await page
			.locator('button[aria-haspopup="menu"]')
			.filter({ hasText: /change stage/i })
			.click();
		await page.getByRole('menuitem', { name: /^contacted$/i }).click();
		await expect(page.getByText(/2 leads updated/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('CRM Leads — detail page tabs', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('tabs visible: Profile / Activity / Reminders / History', async ({ page }) => {
		const lead = makeLead();
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMocks([
			{ method: 'GET', path: `/api/v1/crm/leads/${lead.id}`, status: 200, body: lead },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/reminders`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/history`,
				status: 200,
				body: { items: [], has_more: false }
			}
		]);
		await page.goto(`/leads/${lead.id}`);
		await expect(page.getByRole('heading', { name: 'Mahesh Pharma' })).toBeVisible({
			timeout: 5000
		});

		for (const tab of ['Profile', 'Activity', 'Reminders', 'History']) {
			await expect(page.getByRole('tab', { name: tab })).toBeVisible();
		}
	});

	test('deep link ?tab=activity preselects the Activity tab', async ({ page }) => {
		const lead = makeLead();
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMocks([
			{ method: 'GET', path: `/api/v1/crm/leads/${lead.id}`, status: 200, body: lead },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/reminders`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/history`,
				status: 200,
				body: { items: [], has_more: false }
			}
		]);
		await page.goto(`/leads/${lead.id}?tab=activity`);
		const activityTab = page.getByRole('tab', { name: 'Activity' });
		await expect(activityTab).toHaveAttribute('aria-selected', 'true');
		// Activity panel body — the "Log call" button is unique to that tab.
		await expect(page.getByRole('button', { name: /log call/i })).toBeVisible();
	});

	test('clicking a tab updates the URL with ?tab=<value>', async ({ page }) => {
		const lead = makeLead();
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMocks([
			{ method: 'GET', path: `/api/v1/crm/leads/${lead.id}`, status: 200, body: lead },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/reminders`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/history`,
				status: 200,
				body: { items: [], has_more: false }
			}
		]);
		await page.goto(`/leads/${lead.id}`);
		// Default tab is profile — no ?tab= in URL.
		expect(new URL(page.url()).searchParams.get('tab')).toBeNull();
		await page.getByRole('tab', { name: 'Reminders' }).click();
		await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('reminders');
		// Going back to default clears the param.
		await page.getByRole('tab', { name: 'Profile' }).click();
		await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBeNull();
	});

	test('LogCallDialog submit POSTs /calls + shows toast', async ({ page }) => {
		const lead = makeLead();
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMocks([
			{ method: 'GET', path: `/api/v1/crm/leads/${lead.id}`, status: 200, body: lead },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/reminders`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/history`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'POST',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 201,
				body: {
					id: '00000000-0000-4000-8000-000000000aaa',
					lead_id: lead.id,
					called_at: '2026-05-24T10:00:00Z',
					outcome: 'connected',
					notes: null,
					callback_at: null,
					callback_window_minutes: null,
					logged_by_membership_id: TEST_MEMBERSHIP_ID,
					created_at: '2026-05-24T10:00:00Z'
				}
			}
		]);

		await page.goto(`/leads/${lead.id}`);
		await page.getByRole('tab', { name: 'Activity' }).click();
		await page.getByRole('button', { name: /log call/i }).click();
		await expect(page.getByRole('heading', { name: 'Log call' })).toBeVisible();

		await page.locator('button[type="submit"][form="log-call-form"]').click();
		await expect(page.getByText(/call logged/i)).toBeVisible({ timeout: 5000 });
	});

	test('Reassign dialog requires a membership id', async ({ page }) => {
		const lead = makeLead();
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMocks([
			{ method: 'GET', path: `/api/v1/crm/leads/${lead.id}`, status: 200, body: lead },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/reminders`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/history`,
				status: 200,
				body: { items: [], has_more: false }
			}
		]);

		await page.goto(`/leads/${lead.id}`);
		await page.getByRole('button', { name: /reassign/i }).click();
		await expect(page.getByRole('heading', { name: 'Reassign lead' })).toBeVisible();

		// Submit with empty membership id — Zod blocks the POST. The Combobox
		// keeps `to_membership_id` empty until an option is selected.
		await page.locator('button[type="submit"][form="reassign-lead-form"]').click();
		await expect(page.getByText(/pick the new owner/i)).toBeVisible({ timeout: 3000 });
	});

	test('Reassign dialog happy path POSTs /reassign + toast', async ({ page }) => {
		const lead = makeLead();
		const reassigned = makeLead({ owner_membership_id: NEW_OWNER });
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMocks([
			{ method: 'GET', path: `/api/v1/crm/leads/${lead.id}`, status: 200, body: lead },
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/calls`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/reminders`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: `/api/v1/crm/leads/${lead.id}/history`,
				status: 200,
				body: { items: [], has_more: false }
			},
			{
				method: 'GET',
				path: '/api/v1/identity/memberships',
				status: 200,
				body: {
					memberships: [
						{
							id: NEW_OWNER,
							person_id: '00000000-0000-4000-8000-0000000000dd',
							first_name: 'Asha',
							last_name: 'Verma',
							email: 'asha@example.com'
						}
					]
				}
			},
			{
				method: 'POST',
				path: `/api/v1/crm/leads/${lead.id}/reassign`,
				status: 200,
				body: reassigned
			}
		]);

		await page.goto(`/leads/${lead.id}`);
		await page.getByRole('button', { name: /^reassign/i }).click();
		await expect(page.getByRole('heading', { name: 'Reassign lead' })).toBeVisible();

		// Combobox: focus the typeahead input and type two+ characters to
		// trigger the membership search query (gated by q.length >= 2).
		const newOwnerInput = page.getByRole('combobox', { name: 'New owner' });
		await newOwnerInput.focus();
		await newOwnerInput.pressSequentially('Asha', { delay: 30 });
		await expect(page.getByRole('option').filter({ hasText: /Asha Verma/ })).toBeVisible({
			timeout: 5000
		});
		await page
			.getByRole('option')
			.filter({ hasText: /Asha Verma/ })
			.click();
		await page.locator('button[type="submit"][form="reassign-lead-form"]').click();
		await expect(page.getByText(/lead reassigned/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('CRM Leads — bulk upload', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('open drawer → upload CSV → preview → commit shows result', async ({ page }) => {
		await signInAndPrime(page, []);
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/crm/leads/bulk-upload/preview',
				status: 200,
				body: {
					total_rows: 2,
					rows: [{ contact_name: 'A' }, { contact_name: 'B' }],
					errors: []
				}
			},
			{
				method: 'POST',
				path: '/api/v1/crm/leads/bulk-upload/commit',
				status: 200,
				body: { inserted: 2, updated: 0, failed: 0, errors: [] }
			}
		]);
		await page.goto('/leads');

		await page
			.locator('#main-content')
			.getByRole('button', { name: /bulk upload/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: 'Bulk upload leads' })).toBeVisible();

		const fileInput = page.getByTestId('bulk-upload-input');
		await fileInput.setInputFiles({
			name: 'leads.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from('contact_name,mobile_number\nA,+919876543210\nB,+919876543211\n')
		});

		await page.getByRole('button', { name: /^preview$/i }).click();
		await expect(page.getByText(/2 total/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByText(/2 valid/i)).toBeVisible();

		await page.getByRole('button', { name: /commit upload/i }).click();
		await expect(page.getByText(/upload complete/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByText(/2 inserted/i)).toBeVisible();
	});
});
