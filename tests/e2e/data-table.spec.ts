import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './helpers/test';

/**
 * DataTable on /data-table-bench: 1,000 seeded rows, eight columns, client sorting, multi selection, row links
 * and keyboard navigation. The body is windowed, so these specs check what a user sees at the window's edges.
 *
 * Timings are annotations (informational, spec 5.6), failing only above 500 ms: CI runners are shared and a
 * 100 ms budget would fail on noise.
 */

const FAIL_ABOVE_MS = 500;

async function open(page: Page, query = '') {
	await page.goto(`/data-table-bench${query}`);
	await page.waitForSelector('html[data-hydrated="true"]');
	await expect(page.getByRole('region', { name: 'Bench rows' })).toBeVisible();
}

const scroller = (page: Page) => page.locator('[data-slot="data-table-scroll"]');
const rowIds = (page: Page) =>
	page
		.locator('tbody tr[data-row-id]')
		.evaluateAll((els) => els.map((e) => e.getAttribute('data-row-id')));

test('scrolling to the bottom shows the last row, and the body stays a window', async ({
	page
}) => {
	await open(page);
	expect((await rowIds(page)).length).toBeLessThan(100);
	await scroller(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await expect(page.locator('tbody tr[data-row-id="r-1000"]')).toBeVisible();
	expect((await rowIds(page)).length).toBeLessThan(100);
	await expect(page.locator('table')).toHaveAttribute('aria-rowcount', '1001');
});

test('the header stays pinned while the body scrolls', async ({ page }) => {
	await open(page);
	await scroller(page).evaluate((el) => el.scrollTo(0, 4000));
	const header = page.getByRole('columnheader', { name: 'Name' });
	const box = await header.boundingBox();
	const area = await scroller(page).boundingBox();
	expect(Math.abs(box!.y - area!.y)).toBeLessThan(2);
});

test('sorting by Name finishes quickly and reorders the rows', async ({ page }) => {
	await open(page);
	const first = page.locator('tbody tr[data-row-id]').first();
	const before = await first.innerText();
	const ms = await page.evaluate(async () => {
		const button = [...document.querySelectorAll('thead th button')].find((b) =>
			b.textContent?.includes('Name')
		) as HTMLElement;
		const body = document.querySelector('tbody')!;
		const start = performance.now();
		const done = new Promise<number>((resolve) => {
			const observer = new MutationObserver(() => {
				observer.disconnect();
				resolve(performance.now() - start);
			});
			observer.observe(body, { childList: true, subtree: true, characterData: true });
		});
		button.click();
		return done;
	});
	test.info().annotations.push({ type: 'perf', description: `sort: ${ms.toFixed(1)} ms` });
	expect(ms).toBeLessThan(FAIL_ABOVE_MS);
	await expect(page.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
		'aria-sort',
		'ascending'
	);
	expect(await page.locator('tbody tr[data-row-id]').first().innerText()).not.toBe(before);
});

test('ticking a row checkbox updates quickly, and the selection survives scrolling away and back', async ({
	page
}) => {
	await open(page);
	const box = page.locator('tbody tr[data-row-id="r-1"] [role="checkbox"]');
	const label = (await box.getAttribute('aria-label')) as string;
	const ms = await page.evaluate(async (name) => {
		const el = document.querySelector(`[aria-label="${name}"]`) as HTMLElement;
		const start = performance.now();
		const done = new Promise<number>((resolve) => {
			const observer = new MutationObserver(() => {
				if (el.getAttribute('aria-checked') === 'true') {
					observer.disconnect();
					resolve(performance.now() - start);
				}
			});
			observer.observe(el, { attributes: true, attributeFilter: ['aria-checked'] });
		});
		el.click();
		return done;
	}, label);
	test.info().annotations.push({ type: 'perf', description: `select: ${ms.toFixed(1)} ms` });
	expect(ms).toBeLessThan(FAIL_ABOVE_MS);
	await scroller(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await expect(page.locator('tbody tr[data-row-id="r-1000"]')).toBeVisible();
	await expect(page.getByLabel(label)).toHaveCount(0);
	await scroller(page).evaluate((el) => el.scrollTo(0, 0));
	await expect(page.getByLabel(label)).toHaveAttribute('aria-checked', 'true');
	await expect(page.getByText('1 selected')).toBeVisible();
});

test('Select all selects all 1,000 loaded rows', async ({ page }) => {
	await open(page);
	await page.getByRole('checkbox', { name: 'Select all' }).click();
	await expect(page.getByText('1000 selected')).toBeVisible();
});

test('ArrowDown moves focus row by row, across the window edge', async ({ page }) => {
	await open(page);
	const rows = page.locator('tbody tr[data-row-id]');
	await rows.first().focus();
	const rendered = (await rowIds(page)).length;
	for (let i = 0; i < rendered + 3; i++) await page.keyboard.press('ArrowDown');
	await expect(page.locator(':focus')).toHaveAttribute('data-row-id', `r-${rendered + 4}`);
	await page.keyboard.press('End');
	await expect(page.locator(':focus')).toHaveAttribute('data-row-id', 'r-1000');
	await page.keyboard.press('Home');
	await expect(page.locator(':focus')).toHaveAttribute('data-row-id', 'r-1');
});

test('a scroll through the whole list is traced (informational)', async ({
	page,
	context
}, testInfo) => {
	await open(page);
	await context.tracing.start({ screenshots: false, snapshots: false });
	await scroller(page).evaluate(async (el) => {
		for (let y = 0; y < el.scrollHeight; y += 2000) {
			el.scrollTo(0, y);
			await new Promise((r) => requestAnimationFrame(() => r(null)));
		}
	});
	const path = testInfo.outputPath('data-table-scroll-trace.zip');
	await context.tracing.stop({ path });
	await testInfo.attach('data-table-scroll-trace', { path, contentType: 'application/zip' });
});

test('the page has no sticky-header material', async ({ page }) => {
	await open(page);
	const filter = await page.locator('thead').evaluate((el) => getComputedStyle(el).backdropFilter);
	expect(filter === 'none' || filter === '').toBe(true);
});

/**
 * Rows of three heights (a name with a subtitle on every fifth row, a wrapped note on every seventh),
 * in both densities: the case that crashed the first windowing. No page error, no error page, and
 * after every jump the rows that fill the viewport are rendered (no blank frame).
 */
for (const density of ['compact', 'default'] as const) {
	test(`mixed row heights scroll without a crash or a blank frame (${density})`, async ({
		page
	}) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await open(page);
		await page.getByRole('button', { name: density, exact: true }).click();
		const blank = async () =>
			scroller(page).evaluate((el) => {
				const view = el.getBoundingClientRect();
				const head = el.querySelector('thead')?.getBoundingClientRect().height ?? 0;
				const rows = [...el.querySelectorAll('tbody tr[data-row-id]')].map((r) =>
					r.getBoundingClientRect()
				);
				let covered = view.top + head;
				for (const r of rows.sort((a, b) => a.top - b.top)) {
					if (r.bottom <= covered) continue;
					if (r.top - covered > 1) return true;
					covered = Math.max(covered, r.bottom);
				}
				return covered < view.bottom - 1 && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
			});
		for (const top of [1244, 2799, 3421, 20000, 1e7, 3421, 0, 1e7, 0]) {
			await scroller(page).evaluate((el, y) => el.scrollTo(0, y), top);
			await page.waitForTimeout(80);
			expect(await blank(), `blank frame at ${top}`).toBe(false);
			await expect(page.getByText(/^Error 500/)).toHaveCount(0);
		}
		// 120 arrow steps over rows of mixed heights lose no row
		await scroller(page).evaluate((el) => el.scrollTo(0, 0));
		await page.locator('tbody tr[data-row-id]').first().focus();
		for (let i = 0; i < 120; i++) await page.keyboard.press('ArrowDown');
		await expect(page.locator(':focus')).toHaveAttribute('data-row-id', 'r-121');
		expect(errors).toEqual([]);
	});
}

test('column widths do not move while the body scrolls', async ({ page }) => {
	await open(page);
	const widths = () =>
		page
			.locator('thead th')
			.evaluateAll((ths) => ths.map((th) => Math.round(th.getBoundingClientRect().width)));
	const first = await widths();
	for (const top of [900, 4000, 12000, 30000]) {
		await scroller(page).evaluate((el, y) => el.scrollTo(0, y), top);
		await page.waitForTimeout(80);
		expect(await widths()).toEqual(first);
	}
});

test('the header keeps its bottom edge once it is stuck', async ({ page }) => {
	await open(page);
	await scroller(page).evaluate((el) => el.scrollTo(0, 3000));
	const shadow = await page
		.locator('thead th')
		.first()
		.evaluate((th) => getComputedStyle(th).boxShadow);
	expect(shadow).not.toBe('none');
});

test('sorting starts at the top', async ({ page }) => {
	await open(page);
	await scroller(page).evaluate((el) => el.scrollTo(0, 20000));
	await page.getByRole('button', { name: /^Name/ }).click();
	await expect.poll(() => scroller(page).evaluate((el) => el.scrollTop)).toBe(0);
});

test('Tab leaves the table in a few presses', async ({ page }) => {
	await open(page);
	await page.locator('tbody tr[data-row-id]').first().focus();
	for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
	const inside = await page.evaluate(() => !!document.activeElement?.closest('tbody'));
	expect(inside).toBe(false);
});

test('axe finds no serious or critical violation, at the top and scrolled', async ({ page }) => {
	await open(page);
	for (const top of [0, 6000]) {
		await scroller(page).evaluate((el, y) => el.scrollTo(0, y), top);
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
			.include('main')
			.analyze();
		const blocking = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
	}
});

const focusedRow = (page: Page) =>
	page.evaluate(
		() => document.activeElement?.closest<HTMLElement>('tr[data-row-id]')?.dataset.rowId ?? 'BODY'
	);

test('a focused row far from the viewport costs one more row, not every row in between', async ({
	page
}) => {
	await open(page);
	await page.locator('tbody tr[data-row-id="r-1"]').focus();
	await scroller(page).evaluate((el) => el.scrollTo(0, 20000));
	// the window has moved on: the row after the focused one is far from r-2
	await expect.poll(async () => (await rowIds(page))[1]).not.toBe('r-2');
	const ids = await rowIds(page);
	expect(ids[0]).toBe('r-1');
	expect(ids).not.toContain('r-2');
	expect(ids.length).toBeLessThan(60);
	expect(await focusedRow(page)).toBe('r-1');
	// the height the rows stand for is unchanged: the last row is still where the scrollbar says
	await scroller(page).evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await expect(page.locator('tbody tr[data-row-id="r-1000"]')).toBeVisible();
	expect((await rowIds(page)).length).toBeLessThan(60);
	expect(await focusedRow(page)).toBe('r-1');
	await page.keyboard.press('ArrowDown');
	await expect(page.locator(':focus')).toHaveAttribute('data-row-id', 'r-2');
	await expect(page.locator('tbody tr[data-row-id="r-2"]')).toBeInViewport();
});

test('without nav: the row whose checkbox has focus stays mounted, and Tab leaves in a few presses', async ({
	page
}) => {
	await open(page, '?nav=0');
	const box = page.locator('tbody tr[data-row-id="r-5"] [role="checkbox"]');
	await box.focus();
	await scroller(page).evaluate((el) => el.scrollTo(0, 20000));
	await expect.poll(async () => (await rowIds(page)).includes('r-6')).toBe(false);
	expect((await rowIds(page))[0]).toBe('r-5');
	await expect(box).toBeFocused();
	expect((await rowIds(page)).length).toBeLessThan(60);
	for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
	expect(await page.evaluate(() => !!document.activeElement?.closest('tbody'))).toBe(false);
});

test('with locked widths a cell clips what does not fit instead of drawing over the next column', async ({
	page
}) => {
	await page.setViewportSize({ width: 640, height: 800 });
	await open(page);
	await expect(page.locator('table')).toHaveClass(/table-fixed/);
	await scroller(page).evaluate((el) => el.scrollTo(0, 6000));
	const cells = await page.locator('tbody tr[data-row-id] td').evaluateAll((tds) =>
		tds.map((td) => {
			const style = getComputedStyle(td);
			return `${style.overflowX} ${style.textOverflow}`;
		})
	);
	expect(cells.length).toBeGreaterThan(0);
	expect([...new Set(cells)]).toEqual(['clip ellipsis']);
});

for (const [query, focus, neighbour, label] of [
	['?rows=50', 'r-20', 'r-21', 'not windowed'],
	['?rows=50', 'r-50', 'r-49', 'not windowed, the last row'],
	['', 'r-3', 'r-4', 'windowed']
] as const) {
	test(`a focused row that is removed hands focus to its neighbour (${label})`, async ({
		page
	}) => {
		await open(page, query);
		await page.locator(`tbody tr[data-row-id="${focus}"]`).focus();
		await page.keyboard.press('e');
		await expect(page.locator(`tbody tr[data-row-id="${focus}"]`)).toHaveCount(0);
		await expect.poll(() => focusedRow(page)).toBe(neighbour);
		// it stays there: focus is not dropped to <body> a moment later
		await page.waitForTimeout(300);
		expect(await focusedRow(page)).toBe(neighbour);
	});
}

for (const [query, label] of [
	['?rows=50', 'not windowed'],
	['', 'windowed']
] as const) {
	test(`rows reordered under the focused row keep it focused and do not scroll (${label})`, async ({
		page
	}) => {
		await open(page, query);
		await page.locator('tbody tr[data-row-id="r-5"]').focus();
		for (let i = 0; i < 4; i++) {
			await page.keyboard.press('Enter');
			await page.waitForTimeout(150);
			expect(await focusedRow(page), `after reorder ${i + 1}`).toBe('r-5');
			expect(await scroller(page).evaluate((el) => el.scrollTop)).toBe(0);
		}
		// the keyboard still acts on that row
		await page.keyboard.press('ArrowDown');
		await expect(page.locator(':focus')).toHaveAttribute('data-row-id', 'r-6');
	});
}

test('x in single selection leaves one row selected', async ({ page }) => {
	await open(page, '?select=single');
	await page.locator('tbody tr[data-row-id="r-3"] [role="checkbox"]').click();
	await expect(page.getByText('1 selected')).toBeVisible();
	await page.locator('tbody tr[data-row-id="r-5"] [role="checkbox"]').focus();
	await page.keyboard.press('x');
	await expect(page.locator('tbody tr[data-row-id="r-5"] [role="checkbox"]')).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(page.locator('tbody tr[data-row-id="r-3"] [role="checkbox"]')).toHaveAttribute(
		'aria-checked',
		'false'
	);
	await expect(page.getByText('1 selected')).toBeVisible();
});
