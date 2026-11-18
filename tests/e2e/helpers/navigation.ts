import type { Page } from '@playwright/test';

/** Client-side navigation: click a same-origin anchor so SvelteKit's router handles it. */
export async function clientNavigate(page: Page, href: string): Promise<void> {
	await page.evaluate((h) => {
		document.getElementById('e2e-client-nav')?.remove();
		const a = document.createElement('a');
		a.href = h;
		a.id = 'e2e-client-nav';
		a.textContent = 'go';
		document.body.append(a);
	}, href);
	await page.locator('#e2e-client-nav').click();
}
