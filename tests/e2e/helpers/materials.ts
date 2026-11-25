import { expect, type Locator, type Page } from '@playwright/test';
import { signInAsTier } from './sign-in';
import { registerMock } from './mock';
import { TEST_TENANT_ID } from './fake-jwt';

/**
 * Filtered layers of the page (plan section 5): every element whose computed `backdrop-filter` is not `none`, whatever
 * class gave it. `overScroll` counts the ones that sit OVER MOVING CONTENT: a visible filtered box that is
 * `position: fixed` or `sticky`, or that overlaps the visible box of a scroll container (the page, or any element with
 * `overflow: auto|scroll` that really scrolls) which does not contain it. So a glass sticky table header counts even
 * though it is no `.material-bar`. `area` is the share of the viewport the filtered boxes cover (overlaps counted
 * twice: the budget is a ceiling, not a measurement of unique pixels). `insideScroller` lists filtered elements that
 * sit INSIDE a non-page scroll container (the plan forbids them: they repaint on every scroll).
 */
export async function countFilteredLayers(page: Page): Promise<{
	total: number;
	overScroll: number;
	area: number;
	names: string[];
	insideScroller: string[];
}> {
	return page.evaluate(() => {
		const filtered: Element[] = [];
		for (const el of document.querySelectorAll('*')) {
			const cs = getComputedStyle(el);
			const f = cs.backdropFilter || (cs as unknown as Record<string, string>).webkitBackdropFilter;
			if (f && f !== 'none') filtered.push(el);
		}
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const scrollers = [...document.querySelectorAll('*')].filter((e) => {
			const cs = getComputedStyle(e);
			return (
				/(auto|scroll)/.test(cs.overflowY) &&
				e.scrollHeight > e.clientHeight + 1 &&
				e !== document.body &&
				e !== document.documentElement
			);
		});
		const overlap = (a: DOMRect, b: DOMRect) =>
			Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
			Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
		let area = 0;
		let overScroll = 0;
		const insideScroller: string[] = [];
		const name = (e: Element) =>
			e.getAttribute('data-slot') ?? e.getAttribute('data-shell') ?? e.tagName.toLowerCase();
		for (const el of filtered) {
			const r = el.getBoundingClientRect();
			const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
			const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
			area += w * h;
			if (w * h <= 0) continue;
			const pos = getComputedStyle(el).position;
			const overAScroller = scrollers.some(
				(sc) => !sc.contains(el) && overlap(r, sc.getBoundingClientRect()) > 0
			);
			if (pos === 'fixed' || pos === 'sticky' || overAScroller) overScroll++;
			if (scrollers.some((sc) => sc.contains(el))) insideScroller.push(name(el));
		}
		return {
			total: filtered.length,
			overScroll,
			area: area / (vw * vh),
			names: filtered.map(name),
			insideScroller
		};
	});
}

/**
 * Material elements that contain a `position: fixed` descendant (Filter Effects 2 section 2: a backdrop filter makes
 * the element the containing block of fixed descendants, so a fixed child would stop being fixed to the viewport).
 * Returns a description of each offender; the budget asserts it is empty.
 */
export async function hasFixedDescendant(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const bad: string[] = [];
		const material = document.querySelectorAll(
			'.material-bar, .material-pane, .material-sidebar, .material-sidebar-bar'
		);
		for (const m of material) {
			for (const d of m.querySelectorAll('*')) {
				if (getComputedStyle(d).position === 'fixed')
					bad.push(
						`${m.getAttribute('data-slot') ?? m.className.toString().slice(0, 40)} > ${d.tagName.toLowerCase()}`
					);
			}
		}
		return bad;
	});
}

/** Shared by the material specs: the lk_ui cookie value for a set of preference overrides, and a signed-in /leads table with two rows. */
const b64url = (s: string) =>
	Buffer.from(s, 'utf8')
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');

export const prefs = (extra: Record<string, string>) =>
	b64url(
		JSON.stringify({
			v: 2,
			layout: 'vertical',
			navType: 'default',
			contentWidth: 'default',
			sidebar: 'large',
			mode: 'light',
			palette: 'iris',
			sidebarColors: 'light',
			dock: 'bottom',
			autoHideDock: 'off',
			density: 'comfortable',
			transparency: 'glass',
			...extra
		})
	);

export const LEAD = (id: string, name: string) => ({
	id,
	tenant_id: TEST_TENANT_ID,
	platform_lead_id: '00000000-0000-4000-8000-0000000000ff',
	purchased_at: '2026-05-01T10:00:00Z',
	contact_name: name,
	mobile_number: '+919876543210',
	email: 'c@example.in',
	address: { pin_code: '400001', city: 'Mumbai', district: 'Mumbai', state: 'MH', street: 'x' },
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
	owner_membership_id: '00000000-0000-4000-8000-0000000000b1',
	notes: null,
	created_at: '2026-05-01T10:00:00Z',
	updated_at: '2026-05-20T10:00:00Z'
});

export async function setPrefs(page: Page, extra: Record<string, string>) {
	await page
		.context()
		.addCookies([{ name: 'lk_ui', value: prefs(extra), url: 'http://localhost:4173' }]);
}

export async function leads(page: Page, extra: Record<string, string>) {
	await setPrefs(page, extra);
	await signInAsTier(page, {
		tier: 'tenant-admin',
		permissions: ['tenant.admin', 'crm.leads.view', 'crm.leads.update', 'crm.leads.manage']
	});
	await registerMock({
		method: 'GET',
		path: '/api/v1/crm/leads',
		status: 200,
		body: {
			items: [
				LEAD('00000000-0000-4000-8000-0000000000c1', 'Lead A'),
				LEAD('00000000-0000-4000-8000-0000000000c2', 'Lead B')
			],
			has_more: false
		}
	});
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/leads?view=table');
	await expect(page.locator('html[data-hydrated="true"]')).toBeAttached();
	await expect(page.getByTestId('leads-table').getByText('Lead A')).toBeVisible();
}

export type Paint = { filter: string; alpha: number };

/** Computed backdrop-filter and the alpha of the computed background colour. */
export function paint(loc: Locator): Promise<Paint> {
	return loc.first().evaluate((el) => {
		const cs = getComputedStyle(el);
		const filter =
			cs.backdropFilter || (cs as unknown as Record<string, string>).webkitBackdropFilter || 'none';
		const bg = cs.backgroundColor;
		let alpha = 1;
		const slash = /\/\s*([\d.]+%?)\s*\)$/.exec(bg);
		const comma = /^rgba?\(([^)]*)\)$/.exec(bg);
		if (slash) alpha = slash[1].endsWith('%') ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
		else if (comma && comma[1].split(',').length === 4) alpha = parseFloat(comma[1].split(',')[3]);
		return { filter, alpha };
	});
}

export const glass = (p: Paint, what: string) => {
	expect(p.filter, `${what} backdrop-filter`).not.toBe('none');
	expect(p.filter, what).toContain('blur(');
	expect(p.alpha, `${what} fill alpha`).toBeLessThan(0.9);
	expect(p.alpha, `${what} fill alpha`).toBeGreaterThan(0.5);
};
export const opaque = (p: Paint, what: string) => {
	expect(p.filter, `${what} backdrop-filter`).toBe('none');
	expect(p.alpha, `${what} fill alpha`).toBe(1);
};

/** Opens the user menu, the command palette (a dialog) or the customizer (a sheet) and returns its content. */
export async function overlay(page: Page, kind: 'menu' | 'dialog' | 'sheet') {
	if (kind === 'menu') {
		await page.getByRole('button', { name: 'User menu' }).click();
		const m = page.locator('[data-slot="dropdown-menu-content"]');
		await expect(m).toBeVisible();
		return m;
	}
	if (kind === 'dialog') {
		await page.keyboard.press('Control+k');
		const d = page.locator('[data-slot="dialog-content"]');
		await expect(d).toBeVisible();
		return d;
	}
	await page.getByRole('button', { name: 'Open theme settings' }).click();
	const s = page.locator('[data-slot="sheet-content"]');
	await expect(s).toBeVisible();
	return s;
}
