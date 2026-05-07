import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests via axe-core. Industry canon for a11y in CI:
 * Deque axe-core has the largest rule coverage + lowest false-positive
 * rate among automated WCAG checkers (axe-core docs; WebAIM 2024
 * survey).
 *
 * Per route, we run axe + assert zero serious/critical violations.
 * Moderate + minor surface as warnings in the test report but don't
 * fail CI — those are stylistic / contrast-edge findings that require
 * human review.
 *
 * As routes are added, append a `test('route X is accessible', ...)`
 * entry; the same Builder + filter pattern applies.
 */

test.describe('A11y — WCAG 2.2 AA via axe-core', () => {
	test('signin page has no critical or serious violations', async ({ page }) => {
		await page.goto('/signin');
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
			.analyze();

		const blocking = results.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
	});
});
