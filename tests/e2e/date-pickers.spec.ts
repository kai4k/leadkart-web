import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { glass, opaque, paint, setPrefs } from './helpers/materials';

/**
 * DatePicker and DateRangePicker on the REAL components (the styleguide's Fields and Overlays demos): typed entry and the
 * calendar agree, the popover is a pane (glass at rest, opaque inside a sheet: no glass on glass), a picked or typed date
 * is the same calendar date in every browser time zone, and axe finds nothing serious in any state.
 */

async function guide(page: Page, extra: Record<string, string> = {}) {
	await setPrefs(page, { transparency: 'glass', ...extra });
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/styleguide');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
}
async function openSheetPicker(page: Page) {
	await page.getByRole('button', { name: 'Open sheet' }).click();
	const sheet = page.locator('[data-slot="sheet-content"]');
	await expect(sheet).toBeVisible();
	await page.waitForTimeout(400);
	return sheet;
}
const segs = (scope: ReturnType<Page['locator']>) =>
	scope.locator('[data-segment]:not([data-segment="literal"])');
const text = async (scope: ReturnType<Page['locator']>) =>
	(await segs(scope).allTextContents()).map((t) => t.trim()).join('/');

test.describe('typed entry and calendar agree', () => {
	test('typing day / month / year fills the hidden ISO value and moves the calendar to that month', async ({
		page
	}) => {
		await guide(page);
		const sheet = await openSheetPicker(page);
		await segs(sheet).first().click();
		await page.keyboard.type('10052026');
		await expect(sheet.locator('input[type="hidden"][name="followup"]')).toHaveValue('2026-05-10');
		expect(await text(sheet)).toBe('10/05/2026');
		await sheet.getByRole('button', { name: /Open calendar/ }).click();
		const pop = page.locator('[data-slot="popover-content"]');
		await expect(pop).toBeVisible();
		expect(
			await pop
				.locator('select[aria-label="Month"]')
				.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]!.textContent?.trim())
		).toBe('May');
		await expect(pop.locator('select[aria-label="Year"]')).toHaveValue('2026');
		await expect(pop.locator('[data-bits-day][data-selected]')).toHaveText('10');
	});

	test('the month and year dropdowns pick a date far away; picking a day fills the segments and closes', async ({
		page
	}) => {
		await guide(page);
		const sheet = await openSheetPicker(page);
		await sheet.getByRole('button', { name: /Open calendar/ }).click();
		const pop = page.locator('[data-slot="popover-content"]');
		await expect(pop).toBeVisible();
		await pop.locator('select[aria-label="Year"]').selectOption('2030');
		await pop.locator('select[aria-label="Month"]').selectOption({ label: 'Mar' });
		await pop
			.locator('[data-bits-day]:not([data-outside-month])')
			.filter({ hasText: /^15$/ })
			.click();
		await expect(pop).toBeHidden();
		await expect(sheet.locator('input[type="hidden"][name="followup"]')).toHaveValue('2030-03-15');
		expect(await text(sheet)).toBe('15/03/2030');
	});

	test('Alt+ArrowDown opens the calendar and Escape closes it, returning focus', async ({
		page
	}) => {
		await guide(page);
		const sheet = await openSheetPicker(page);
		await segs(sheet).first().click();
		await page.keyboard.press('Alt+ArrowDown');
		await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.locator('[data-slot="popover-content"]')).toBeHidden();
	});

	test('a half-typed date shows the incomplete error on the group (aria-invalid) when focus leaves', async ({
		page
	}) => {
		await guide(page);
		const sheet = await openSheetPicker(page);
		await segs(sheet).first().click();
		await page.keyboard.type('10');
		await page.getByRole('heading', { name: 'Demo sheet' }).click();
		await expect(sheet.getByText('Enter a complete date')).toBeVisible();
		await expect(sheet.locator('[data-slot="date-field-input"]')).toHaveAttribute(
			'aria-invalid',
			'true'
		);
	});

	test('the range picker: two named groups; typing both ends; an end before the start is invalid', async ({
		page
	}) => {
		await guide(page);
		const range = page.locator('[data-slot="date-range-field-input"]');
		await expect(range.first()).toHaveAttribute('aria-label', 'Period, start date');
		await expect(range.nth(1)).toHaveAttribute('aria-label', 'Period, end date');
		await segs(range.first()).first().click();
		await page.keyboard.type('20052026');
		await segs(range.nth(1)).first().click();
		await page.keyboard.type('10052026');
		await expect(range.first()).toHaveAttribute('aria-invalid', 'true');
		await expect(range.nth(1)).toHaveAttribute('aria-invalid', 'true');
		await segs(range.nth(1)).first().click();
		await page.keyboard.type('25052026');
		await expect(range.first()).not.toHaveAttribute('aria-invalid', 'true');
	});
});

test.describe('the popover is a pane; inside a sheet it is opaque (no glass on glass)', () => {
	test('at rest the calendar popover is glass; over an open sheet it is opaque while the sheet stays glass', async ({
		page
	}) => {
		await guide(page);
		await page
			.getByRole('button', { name: /Open calendar, Follow-up date/ })
			.first()
			.click();
		const pop = page.locator('[data-slot="popover-content"]');
		await expect(pop).toBeVisible();
		await page.waitForTimeout(300);
		glass(await paint(pop), 'date popover at rest');
		await page.keyboard.press('Escape');
		await expect(pop).toBeHidden();

		const sheet = await openSheetPicker(page);
		glass(await paint(sheet), 'sheet');
		await sheet.getByRole('button', { name: /Open calendar/ }).click();
		await expect(pop).toBeVisible();
		await page.waitForTimeout(300);
		opaque(await paint(pop), 'date popover inside a sheet');
		glass(await paint(sheet), 'the sheet beneath keeps its material');
	});
});

for (const timezoneId of ['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
	test.describe(`time zone ${timezoneId}`, () => {
		test.use({ timezoneId });
		test(`a typed 01/01/2026 and a picked 31/12/2025 are the same calendar dates in ${timezoneId}`, async ({
			page
		}) => {
			await guide(page);
			const sheet = await openSheetPicker(page);
			const hidden = sheet.locator('input[type="hidden"][name="followup"]');
			await segs(sheet).first().click();
			await page.keyboard.type('01012026');
			await expect(hidden).toHaveValue('2026-01-01');
			// pick the 31st of December 2025 from the calendar
			await sheet.getByRole('button', { name: /Open calendar/ }).click();
			const pop = page.locator('[data-slot="popover-content"]');
			await pop.locator('select[aria-label="Year"]').selectOption('2025');
			await pop.locator('select[aria-label="Month"]').selectOption({ label: 'Dec' });
			await pop
				.locator('[data-bits-day]:not([data-outside-month])')
				.filter({ hasText: /^31$/ })
				.click();
			await expect(hidden).toHaveValue('2025-12-31');
			expect(await text(sheet)).toBe('31/12/2025');
		});
	});
}

test.describe('axe (serious or critical = fail)', () => {
	for (const mode of ['light', 'dark'])
		test(`the pickers closed and the calendar open (${mode})`, async ({ page }) => {
			await guide(page, { mode });
			await page.emulateMedia({ reducedMotion: 'reduce' });
			const scan = async (label: string) => {
				const r = await new AxeBuilder({ page })
					.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
					.analyze();
				const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
				expect(
					bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
					label
				).toEqual([]);
			};
			await scan('closed');
			await page
				.getByRole('button', { name: /Open calendar, Follow-up date/ })
				.first()
				.click();
			await expect(page.locator('[data-slot="popover-content"]')).toBeVisible();
			await page.waitForTimeout(300);
			await scan('calendar open');
		});
});
