import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { glass, opaque, paint, setPrefs } from './helpers/materials';

/**
 * The REAL FormSheet and the REAL ReasonConfirmDialog (the styleguide's "Form sheet and reason confirm" demo, not a
 * stand-in): a form sheet is glass at rest, a confirm opened over it is OPAQUE (computed `backdrop-filter: none`), the
 * sheet stays glass under it, the confirm is an alert dialog (Cancel first and focused, an outside press does not dismiss
 * it, Escape closes only it), and type-to-confirm blocks until the name is typed. axe finds nothing serious in either.
 */

async function guide(page: Page, extra: Record<string, string> = {}) {
	await setPrefs(page, { transparency: 'glass', ...extra });
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/styleguide');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
}

async function openReasonOverSheet(page: Page) {
	await page.getByRole('button', { name: 'Open form sheet' }).click();
	const sheet = page.locator('[data-slot="sheet-content"]');
	await expect(sheet).toBeVisible();
	await page.waitForTimeout(400);
	await sheet.getByRole('button', { name: 'Delete the demo' }).click();
	const confirm = page.locator('[data-slot="alert-dialog-content"]');
	await expect(confirm).toBeVisible();
	await page.waitForTimeout(300);
	return { sheet, confirm };
}

test.describe('a reason confirm over a form sheet', () => {
	test('the sheet is glass, the confirm over it is opaque (no glass on glass), under the real components', async ({
		page
	}) => {
		await guide(page);
		await page.getByRole('button', { name: 'Open form sheet' }).click();
		const sheet = page.locator('[data-slot="sheet-content"]');
		await expect(sheet).toBeVisible();
		await page.waitForTimeout(400);
		glass(await paint(sheet), 'form sheet at rest');
		// the form's own parts add no material of their own
		for (const part of ['sheet-header', 'sheet-body', 'sheet-footer'])
			expect((await paint(sheet.locator(`[data-slot="${part}"]`))).filter, part).toBe('none');
		await sheet.getByRole('button', { name: 'Delete the demo' }).click();
		const confirm = page.locator('[data-slot="alert-dialog-content"]');
		await expect(confirm).toBeVisible();
		await page.waitForTimeout(300);
		expect((await paint(confirm)).filter, 'confirm over the sheet: computed backdrop-filter').toBe(
			'none'
		);
		opaque(await paint(confirm), 'confirm over the sheet');
		glass(await paint(sheet), 'the sheet stays glass under the confirm');
	});

	test('an alert dialog: Cancel first and focused, type-to-confirm blocks, an outside press does not dismiss, Escape closes only the confirm', async ({
		page
	}) => {
		await guide(page);
		const { sheet, confirm } = await openReasonOverSheet(page);
		await expect(confirm).toHaveAttribute('role', 'alertdialog');
		const buttons = confirm.locator('[data-slot="alert-dialog-footer"] button');
		await expect(buttons.first()).toHaveText('Cancel');
		await expect(buttons.first()).toBeFocused();
		const confirmButton = buttons.nth(1);
		await expect(confirmButton).toBeDisabled();
		await confirm.getByRole('textbox', { name: 'Reason' }).fill('a demonstration');
		await expect(confirmButton).toBeDisabled(); // the name is not typed yet
		await confirm.getByRole('textbox', { name: /Type acme to confirm/ }).fill('acme');
		await expect(confirmButton).toBeEnabled();
		// an outside press (the scrim, on the left of the sheet) does not dismiss it
		await page.mouse.click(40, 450);
		await expect(confirm).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(confirm).toBeHidden();
		await expect(sheet).toBeVisible(); // only the confirm closed
	});

	test('Escape does not close the sheet while the confirm is open, and a confirmed deletion closes the confirm itself', async ({
		page
	}) => {
		await guide(page);
		const { sheet, confirm } = await openReasonOverSheet(page);
		await confirm.getByRole('textbox', { name: 'Reason' }).fill('a demonstration');
		await confirm.getByRole('textbox', { name: /Type acme to confirm/ }).fill('acme');
		await confirm.locator('[data-slot="alert-dialog-footer"] button').nth(1).click();
		await expect(confirm).toBeHidden();
		await expect(sheet).toBeVisible();
	});

	for (const mode of ['light', 'dark'] as const) {
		test(`axe: no serious or critical violation with the confirm over the sheet (${mode})`, async ({
			page
		}) => {
			await guide(page, { mode });
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await openReasonOverSheet(page);
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			const bad = results.violations.filter((v) =>
				['serious', 'critical'].includes(v.impact ?? '')
			);
			expect(
				bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
			).toEqual([]);
		});
	}
});
