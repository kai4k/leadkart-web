import type { Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from './helpers/test';

// The recorded values are Chromium's serialisations of computed colours (`color(srgb 0.99987 ...)`, `oklch(...)`): Firefox and
// WebKit print the same colour with different digits, so a string comparison there fails without a real difference.
test.skip(
	({ browserName }) => browserName !== 'chromium',
	"recorded values are Chromium's colour serialisation"
);

/**
 * The computed value of every semantic token (and, until Task 16, every legacy `--color-*` alias), light mode,
 * default (Iris) palette, read from ONE probe element, against a recorded table
 * (`fixtures/tokens-light-iris.json`). A later change to `--muted-foreground`, `--input`,
 * `--ring`, a status colour or a legacy alias fails here and has to be made on purpose: re-record
 * with `LK_RECORD_TOKENS=1 npx playwright test tests/e2e/tokens-probe.spec.ts --project=chromium`
 * and review the diff of the JSON.
 *
 * Names come from the CSS sources, so a new semantic token fails until it is recorded. A legacy
 * alias Tailwind did not emit (nothing uses it) resolves to transparent and is not recorded.
 */

const ROOT = process.cwd();
const TABLE = join(ROOT, 'tests', 'e2e', 'fixtures', 'tokens-light-iris.json');

const semanticNames = [
	...new Set(
		[
			...readFileSync(join(ROOT, 'src/styles/theme/semantic.css'), 'utf8').matchAll(
				/^\s*(--[\w-]+)\s*:/gm
			)
		].map((m) => m[1])
	)
].sort();
const tokensCss = readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8');
const legacyNames = [
	...new Set(
		[
			...tokensCss
				.slice(0, tokensCss.indexOf('TAILWIND BRIDGE'))
				.matchAll(/^\s*(--color-[\w-]+)\s*:/gm)
		].map((m) => m[1])
	)
].sort();

async function probe(page: Page, names: string[]) {
	return page.evaluate((list) => {
		const el = document.createElement('div');
		document.body.append(el);
		const out: Record<string, string> = {};
		for (const name of list) {
			el.style.backgroundColor = '';
			el.style.setProperty('background-color', `var(${name})`);
			out[name] = getComputedStyle(el).backgroundColor;
		}
		el.remove();
		return out;
	}, names);
}

test('every semantic token and legacy alias keeps its recorded light/Iris value', async ({
	page
}) => {
	await page.goto('/signin');
	await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
	await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
	await expect(page.locator('html')).toHaveAttribute('data-palette', 'iris');

	const semantic = await probe(page, semanticNames);
	const legacy = await probe(page, legacyNames);
	// a legacy alias nothing uses is not emitted by Tailwind: transparent, not part of the table
	const legacyEmitted = Object.fromEntries(
		Object.entries(legacy).filter(([, v]) => v !== 'rgba(0, 0, 0, 0)')
	);
	const measured = { semantic, legacy: legacyEmitted };

	if (process.env.LK_RECORD_TOKENS) {
		writeFileSync(
			process.env.LK_RECORD_TOKENS_TO || TABLE,
			`${JSON.stringify(measured, null, '\t')}\n`
		);
		return;
	}
	const recorded = JSON.parse(readFileSync(TABLE, 'utf8')) as typeof measured;
	// every semantic token is in the table (a new one has to be recorded), and equal
	expect(Object.keys(semantic).sort()).toEqual(Object.keys(recorded.semantic).sort());
	expect(semantic).toEqual(recorded.semantic);
	// Task 16 deleted the legacy `--color-*` aliases: tokens.css declares none and none is emitted
	// (the `legacy` table in the fixture is history; re-recording drops it)
	expect(legacyNames).toEqual([]);
	expect(legacyEmitted).toEqual({});
});
