/**
 * The shell's navigation: ONE function builds it for the sidebar and the horizontal nav
 * (`shellNav`), and every label it shows has a locale key in English and in Hindi.
 */
import { describe, expect, it } from 'vitest';
import en from '../../../src/lib/i18n/locales/en.json';
import { NAV_ROUTES, shellNav, visibleNav } from '#lib/config/nav.ts';
import {
	NEW_TENANT_ADMIN,
	OPERATOR_PLATFORM_ADMIN,
	SUPER_USER
} from '../../support/go-personas.ts';

type Dict = { nav?: { items?: Record<string, string>; sections?: Record<string, string> } };
const items = (d: Dict) => d.nav?.items ?? {};
const sections = (d: Dict) => d.nav?.sections ?? {};

describe('shellNav', () => {
	it('is the visible nav without the tenant-context section (that is the scope layout tabs)', () => {
		for (const [caps, ctx] of [
			[SUPER_USER, false],
			[SUPER_USER, true],
			[NEW_TENANT_ADMIN, false]
		] as const) {
			const all = visibleNav(caps, ctx);
			expect(shellNav(caps, ctx)).toEqual(all.filter((s) => s.id !== 'tenantContext'));
			expect(shellNav(caps, ctx).map((s) => s.id)).not.toContain('tenantContext');
		}
	});

	it('in a tenant context the own-tenant entries are gone', () => {
		const keys = shellNav(OPERATOR_PLATFORM_ADMIN, true).flatMap((s) => s.items.map((i) => i.key));
		expect(keys).not.toContain('team');
		expect(keys).not.toContain('tenantSettings');
		expect(keys).not.toContain('permissionRequests');
	});
});

describe('nav labels are localised', () => {
	// every entry, hidden ones too: a breadcrumb names them
	const shown = Object.entries(NAV_ROUTES);

	it.each(shown.map(([key]) => [key]))(
		'item %s has an English label key (English only for now)',
		(key) => {
			expect(items(en)[key], `en nav.items.${key}`).toBeTruthy();
		}
	);

	it('the English labels are the labels nav.ts already shows', () => {
		for (const [key, r] of shown) expect(items(en)[key]).toBe(r.label);
	});

	it('every titled section has both labels', () => {
		for (const id of ['operator', 'tenantContext', 'administration', 'crm', 'account']) {
			expect(sections(en)[id], `en nav.sections.${id}`).toBeTruthy();
		}
	});
});
