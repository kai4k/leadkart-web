import type { Page } from '@playwright/test';

/** Client-side navigation: click a same-origin anchor so SvelteKit's router handles it. */
export async function clientNavigate(page: Page, href: string): Promise<void> {
	await page.evaluate((h) => {
		document.getElementById('e2e-client-nav')?.remove();
		const a = document.createElement('a');
		a.href = h;
		a.id = 'e2e-client-nav';
		a.textContent = 'go';
		// Above the shell: appended to the end of <body> it lands under the fixed sidebar, which then
		// intercepts the click. This link only has to be hit, never seen.
		a.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;padding:8px;background:#fff';
		document.body.append(a);
	}, href);
	await page.locator('#e2e-client-nav').click();
}
