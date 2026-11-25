import type { Page } from '@playwright/test';
import { expect, test } from './helpers/test';

// The recorded values are Chromium's serialisations of computed colours (`color(srgb 0.99987 ...)`, `oklch(...)`): Firefox and
// WebKit print the same colour with different digits, so a string comparison there fails without a real difference.
test.skip(
	({ browserName }) => browserName !== 'chromium',
	"recorded values are Chromium's colour serialisation"
);

/**
 * The token layer was rebuilt without changing the light look: the same computed colours and
 * radius before and after. This pins what a few real elements render, then checks the new modes
 * (dark, auto) follow from `<html data-mode>` with no script.
 */

interface Measured {
	body: { backgroundColor: string; color: string };
	button: { backgroundColor: string; color: string; borderRadius: string };
	card: { backgroundColor: string; borderColor: string; borderRadius: string };
}

async function measure(page: Page): Promise<Measured> {
	return page.evaluate(() => {
		const pick = (el: Element | null, keys: string[]) => {
			if (!el) throw new Error('element to measure not found');
			const cs = getComputedStyle(el);
			return Object.fromEntries(keys.map((k) => [k, cs[k as keyof CSSStyleDeclaration] as string]));
		};
		const card = document.querySelector('[data-slot="card"], .lk-auth-card');
		return {
			body: pick(document.body, ['backgroundColor', 'color']),
			button: pick(document.querySelector('button'), ['backgroundColor', 'color', 'borderRadius']),
			card: pick(card, ['backgroundColor', 'borderColor', 'borderRadius'])
		} as Measured;
	});
}

const b64url = (s: string) =>
	Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

const withMode = (mode: string) =>
	b64url(
		JSON.stringify({
			v: 2,
			layout: 'vertical',
			navType: 'default',
			contentWidth: 'default',
			sidebar: 'large',
			mode,
			palette: 'iris',
			sidebarColors: 'light'
		})
	);

async function setMode(page: Page, mode: string): Promise<void> {
	await page
		.context()
		.addCookies([{ name: 'lk_ui', value: withMode(mode), url: 'http://localhost:4173' }]);
}

// Recorded on the tree before the token rebuild (computed values, as Chromium reports them).
const EXPECTED: Record<string, Measured> = {
	'/styleguide': {
		body: { backgroundColor: 'oklch(0.96 0.008 268)', color: 'oklch(0.18 0.02 250)' },
		button: {
			// the primary button is the vivid fill with a white label (plan G1); the default palette is Iris
			// (the button step 600, #6252e0 in oklch; it was Kart Blue before Pebble World)
			backgroundColor: 'oklch(0.5383 0.207 282)',
			color: 'oklch(1 0 0)',
			borderRadius: '9999px' // capsule (plan G7, Q1)
		},
		card: {
			backgroundColor: 'oklch(1 0 0)',
			borderColor: 'oklch(0.92 0.01 268)',
			borderRadius: '16px'
		}
	},
	'/signin': {
		body: { backgroundColor: 'oklch(0.96 0.008 268)', color: 'oklch(0.18 0.02 250)' },
		button: {
			// The first <button> on /signin. Phase 2 Tasks 4-7 regenerated Button (radius 10px) and
			// moved its muted text to the AA-safe muted-foreground: a deliberate change, not drift.
			backgroundColor: 'rgba(0, 0, 0, 0)',
			// the sign-in card is the pane material (plan G6): its secondary text is the glass-safe muted step
			// (--material-muted-foreground, one step darker than --muted-foreground in light)
			color: 'oklch(0.384 0.02 250)',
			borderRadius: '9999px' // capsule (plan G7, Q1)
		},
		card: {
			// ... its fill is the pane material (popover at 84%): the card is glass in every motion setting (GD22)
			backgroundColor: 'color(srgb 0.99987 1.00005 1.00007 / 0.84)',
			borderColor: 'oklch(0.92 0.01 268)',
			borderRadius: '16px'
		}
	}
};

for (const route of ['/styleguide', '/signin']) {
	test(`light look is unchanged on ${route}`, async ({ page }) => {
		await page.goto(route);
		await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' });
		const values = await measure(page);
		expect(values).toEqual(EXPECTED[route]);
	});
}

test.describe('modes follow <html data-mode> with no script', () => {
	const bodyBg = (page: Page) =>
		page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	const resolved = (page: Page, token: string) =>
		page.evaluate((name) => {
			const probe = document.createElement('div');
			probe.style.backgroundColor = `var(${name})`;
			document.body.append(probe);
			const color = getComputedStyle(probe).backgroundColor;
			probe.remove();
			return color;
		}, token);

	test('mode=dark paints the dark canvas', async ({ page }) => {
		await setMode(page, 'dark');
		await page.goto('/signin');
		expect(await bodyBg(page)).toBe(await resolved(page, '--dark-950'));
		expect(await bodyBg(page)).not.toBe('rgb(255, 255, 255)');
	});

	test('mode=auto follows the OS colour scheme live, without a reload', async ({ page }) => {
		await setMode(page, 'auto');
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/signin');
		const dark = await resolved(page, '--dark-950');
		expect(await bodyBg(page)).toBe(dark);
		await page.emulateMedia({ colorScheme: 'light' });
		expect(await bodyBg(page)).not.toBe(dark);
		await page.emulateMedia({ colorScheme: 'dark' });
		expect(await bodyBg(page)).toBe(dark);
	});

	test('mode=light ignores a dark OS', async ({ page }) => {
		await setMode(page, 'light');
		await page.emulateMedia({ colorScheme: 'dark' });
		await page.goto('/signin');
		expect(await bodyBg(page)).not.toBe(await resolved(page, '--dark-950'));
	});
});
