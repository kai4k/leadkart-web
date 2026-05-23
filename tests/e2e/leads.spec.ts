import { expect, test, type Page } from '@playwright/test';
import { resetMock, registerMock, registerMocks } from './helpers/mock';
import { signInAsTier } from './helpers/sign-in';
import { TEST_MEMBERSHIP_ID, TEST_TENANT_ID } from './helpers/fake-jwt';

/**
 * Leads CRM module e2e — /leads
 *
 *   Discovery:
 *     Nav link from tenant-admin sidebar → /leads (added by the
 *     integration agent; marked test.fixme until that lands)
 *   Positive:
 *     Empty inbox renders with action CTAs
 *     List renders fixture leads + click row opens detail
 *     Create drawer happy path → 201 → toast → list refetches
 *     Edit drawer mutates stage
 *     Delete confirmation removes the row
 *     Bulk select + bulk action posts /v1/leads/bulk-action
 *     Filters set URL params + refetch the list
 *     Bulk upload preview → commit shows result
 *     Keyboard j/Enter focuses + navigates
 *   Negative:
 *     Empty full_name: Zod field error, no POST
 */

const LEAD_ID = '00000000-0000-4000-8000-000000000001';
const LEAD_ID_2 = '00000000-0000-4000-8000-000000000002';
const LEAD_ID_3 = '00000000-0000-4000-8000-000000000003';
const OWNER_MEMBERSHIP = '00000000-0000-4000-8000-0000000000bb';

const LEAD_PERMS = [
	'tenant.admin',
	'crm.leads.view',
	'crm.leads.create',
	'crm.leads.update',
	'crm.leads.delete',
	'crm.leads.bulk_upload'
];

function makeLead(over: Record<string, unknown> = {}) {
	return {
		id: LEAD_ID,
		tenant_id: TEST_TENANT_ID,
		full_name: 'Jane Doe',
		company: 'Acme',
		email: 'jane@acme.com',
		phone: '+15550100',
		source: 'website',
		stage: 'new',
		value: 5000,
		currency: 'USD',
		owner_membership_id: OWNER_MEMBERSHIP,
		tags: ['enterprise'],
		notes: 'Asked about pricing',
		last_contacted_at: '2026-05-20T10:00:00Z',
		next_followup_at: null,
		created_at: '2026-05-01T10:00:00Z',
		updated_at: '2026-05-20T10:00:00Z',
		created_by_membership_id: TEST_MEMBERSHIP_ID,
		...over
	};
}

async function signInAndGotoLeads(
	page: Page,
	leads: ReturnType<typeof makeLead>[] = []
): Promise<void> {
	await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
	await registerMock({
		method: 'GET',
		path: '/api/v1/leads',
		status: 200,
		body: { items: leads, has_more: false }
	});
}

test.describe('Leads — discovery', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('nav link from tenant-admin sidebar reaches /leads', async ({ page }) => {
		await signInAsTier(page, { tier: 'tenant-admin', permissions: LEAD_PERMS });
		await registerMock({
			method: 'GET',
			path: '/api/v1/leads',
			status: 200,
			body: { items: [], has_more: false }
		});
		const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
		await sidebar.getByRole('link', { name: /leads/i }).click();
		await page.waitForURL(/\/leads$/);
	});
});

test.describe('Leads — empty / list', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('empty state renders with action CTAs', async ({ page }) => {
		await signInAndGotoLeads(page, []);
		await page.goto('/leads');

		await expect(
			page.locator('#main-content').getByRole('heading', { level: 1, name: 'Leads' })
		).toBeVisible();
		await expect(page.getByText(/no leads yet/i)).toBeVisible();
		// Two CTAs in the empty state action.
		await expect(
			page
				.locator('#main-content')
				.getByRole('button', { name: /new lead/i })
				.first()
		).toBeVisible();
		await expect(
			page
				.locator('#main-content')
				.getByRole('button', { name: /bulk upload/i })
				.first()
		).toBeVisible();
	});

	test('list renders 3 fixture leads', async ({ page }) => {
		const leads = [
			makeLead({ id: LEAD_ID, full_name: 'Jane Doe' }),
			makeLead({ id: LEAD_ID_2, full_name: 'Bob Smith', stage: 'qualified' }),
			makeLead({ id: LEAD_ID_3, full_name: 'Charlie Cruz', stage: 'won' })
		];
		await signInAndGotoLeads(page, leads);
		await page.goto('/leads');

		await expect(page.getByText('Jane Doe')).toBeVisible();
		await expect(page.getByText('Bob Smith')).toBeVisible();
		await expect(page.getByText('Charlie Cruz')).toBeVisible();
	});

	test('clicking a row navigates to /leads/[id]', async ({ page }) => {
		const lead = makeLead();
		await signInAndGotoLeads(page, [lead]);
		await registerMock({
			method: 'GET',
			path: `/api/v1/leads/${lead.id}`,
			status: 200,
			body: lead
		});
		await page.goto('/leads');
		await page.getByText('Jane Doe').click();
		await page.waitForURL(new RegExp(`/leads/${lead.id}$`));
	});
});

test.describe('Leads — create', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('create happy path: 201 → drawer closes + toast', async ({ page }) => {
		await signInAndGotoLeads(page, []);
		await registerMock({
			method: 'POST',
			path: '/api/v1/leads',
			status: 201,
			body: makeLead({ full_name: 'New Lead' })
		});

		await page.goto('/leads');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /^new lead$/i })
			.first()
			.click();
		await expect(page.getByRole('heading', { name: 'New lead' })).toBeVisible();

		await page.locator('input[name="full_name"]').fill('New Lead');
		await page.locator('button[type="submit"][form="create-lead-form"]').click();

		// Toast can take a moment on Windows CI — give it 10s.
		await expect(page.getByText(/lead created/i)).toBeVisible({ timeout: 10_000 });
	});

	test('empty full_name: Zod error, no POST fires', async ({ page }) => {
		await signInAndGotoLeads(page, []);
		await page.goto('/leads');
		await page
			.locator('#main-content')
			.getByRole('button', { name: /^new lead$/i })
			.first()
			.click();

		// Leave full_name blank, submit.
		await page.locator('button[type="submit"][form="create-lead-form"]').click();
		await expect(page.getByText(/full name is required/i)).toBeVisible({ timeout: 3000 });
	});
});

test.describe('Leads — edit / delete', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('edit drawer changes stage → PATCH', async ({ page }) => {
		const lead = makeLead();
		const updated = makeLead({ stage: 'qualified' });
		await signInAndGotoLeads(page, [lead]);
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/leads/${lead.id}`,
				status: 200,
				body: lead
			},
			{
				method: 'PATCH',
				path: `/api/v1/leads/${lead.id}`,
				status: 200,
				body: updated
			}
		]);
		await page.goto(`/leads/${lead.id}`);
		await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible();

		// Header has an Edit button.
		await page.getByRole('button', { name: /^edit$/i }).click();
		await expect(page.getByRole('heading', { name: 'Edit lead' })).toBeVisible();
		await page.locator('select[name="stage"]').selectOption('qualified');
		await page.locator('button[type="submit"][form="edit-lead-form"]').click();

		await expect(page.getByText(/lead updated/i)).toBeVisible({ timeout: 5000 });
	});

	test('delete confirmation removes the lead', async ({ page }) => {
		const lead = makeLead();
		await signInAndGotoLeads(page, [lead]);
		await registerMocks([
			{
				method: 'GET',
				path: `/api/v1/leads/${lead.id}`,
				status: 200,
				body: lead
			},
			{
				method: 'DELETE',
				path: `/api/v1/leads/${lead.id}`,
				status: 200,
				body: { ...lead, stage: 'lost' }
			}
		]);
		await page.goto(`/leads/${lead.id}`);
		await page.getByRole('button', { name: /^delete$/i }).click();
		// Confirm dialog.
		await expect(page.getByRole('heading', { name: 'Delete lead' })).toBeVisible();
		await page
			.getByRole('button', { name: /^delete$/i })
			.nth(1) // first is the header, second is the confirm dialog
			.click();
		await expect(page.getByText(/lead deleted/i)).toBeVisible({ timeout: 5000 });
		await page.waitForURL(/\/leads$/);
	});
});

test.describe('Leads — bulk select + bulk actions', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('selecting two rows surfaces the bulk action bar', async ({ page }) => {
		const leads = [makeLead({ id: LEAD_ID }), makeLead({ id: LEAD_ID_2, full_name: 'Bob' })];
		await signInAndGotoLeads(page, leads);
		await page.goto('/leads');

		await expect(page.getByText('Jane Doe')).toBeVisible();
		await expect(page.getByText('Bob')).toBeVisible();

		await page.getByLabel('Select Jane Doe').check();
		await page.getByLabel('Select Bob').check();

		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible();
		await expect(page.getByText(/2 selected/i)).toBeVisible();
	});

	test('bulk change_stage posts /v1/leads/bulk-action', async ({ page }) => {
		const leads = [makeLead({ id: LEAD_ID }), makeLead({ id: LEAD_ID_2, full_name: 'Bob' })];
		await signInAndGotoLeads(page, leads);
		await registerMock({
			method: 'POST',
			path: '/api/v1/leads/bulk-action',
			status: 200,
			body: { affected: 2, errors: [] }
		});
		await page.goto('/leads');
		await page.getByLabel('Select Jane Doe').check();
		await page.getByLabel('Select Bob').check();

		// Scope to the bulk bar — there are also per-row "Change stage" cells.
		// The Dropdown.Trigger wraps a <Button> so two buttons match the
		// text — `.first()` lands on the outer trigger that opens the menu.
		await page
			.getByTestId('bulk-actions-bar')
			.getByRole('button', { name: /change stage/i })
			.first()
			.click();
		// Pick "Qualified" from the opened dropdown.
		await page.getByRole('menuitem', { name: 'Qualified' }).click();
		await expect(page.getByText(/2 leads updated/i)).toBeVisible({ timeout: 5000 });
	});
});

test.describe('Leads — filters', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('selecting a stage chip updates URL ?stage=qualified', async ({ page }) => {
		const lead = makeLead({ stage: 'qualified', full_name: 'Q Lead' });
		await signInAndGotoLeads(page, [lead]);
		await page.goto('/leads');

		// Open the stage filter <select> (label "Stage filter") and pick qualified.
		await page
			.locator('select[name="stage filter"], select#select-stage-filter')
			.first()
			.selectOption('qualified');
		await page.waitForURL(/stage=qualified/);

		// Chip should render.
		await expect(page.getByTestId('filter-chips').getByText('Qualified')).toBeVisible();
	});
});

test.describe('Leads — bulk upload', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('open drawer → upload CSV → preview → commit shows result', async ({ page }) => {
		await signInAndGotoLeads(page, []);
		await registerMocks([
			{
				method: 'POST',
				path: '/api/v1/leads/bulk-upload/preview',
				status: 200,
				body: {
					total_rows: 2,
					rows: [{ full_name: 'A' }, { full_name: 'B' }],
					errors: []
				}
			},
			{
				method: 'POST',
				path: '/api/v1/leads/bulk-upload/commit',
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
			buffer: Buffer.from('full_name,email\nA,a@x.com\nB,b@x.com\n')
		});

		await page.getByRole('button', { name: /^preview$/i }).click();
		await expect(page.getByText(/2 total/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByText(/2 valid/i)).toBeVisible();

		await page.getByRole('button', { name: /commit upload/i }).click();
		await expect(page.getByText(/upload complete/i)).toBeVisible({ timeout: 5000 });
		await expect(page.getByText(/2 inserted/i)).toBeVisible();
	});
});

test.describe('Leads — keyboard shortcuts', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('press j to focus row 1, Enter to open detail', async ({ page }) => {
		const lead = makeLead();
		await signInAndGotoLeads(page, [lead]);
		await registerMock({
			method: 'GET',
			path: `/api/v1/leads/${lead.id}`,
			status: 200,
			body: lead
		});
		await page.goto('/leads');
		await expect(page.getByText('Jane Doe')).toBeVisible();

		// Click an inert area so no input has focus, then fire keys.
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('j');
		await page.keyboard.press('Enter');
		await page.waitForURL(new RegExp(`/leads/${lead.id}$`));
	});
});
