import { expect, test, type Page } from '@playwright/test';
import { signInForVisual } from '../fixtures/auth';
import { SNAPSHOT_OPTIONS, setPreferencesCookie, stabilise } from '../fixtures/stability';
import { PREFERENCE_VALUES, type Preferences } from '../../../src/lib/features/preferences/schema';
import { fakeUserDto } from '../../e2e/helpers/fake-jwt';

/**
 * Visual regression: the pairwise preference matrix (plan Task 30, spec section 8).
 *
 * Every route's light and dark shots live in the route specs. Here the customiser axes are covered
 * pairwise, not as a cross product: one shot per non-default value of an axis, on the anchor routes
 * (`/dashboard`, `/settings/users`, `/settings/users/[id]`) until the leads rebuild moves them to the
 * leads list and detail.
 *
 *   structural axes (layout, navType, contentWidth, sidebar, the two mode values) : all 3 anchors
 *   colours, sidebar colours, dark palette, transparency (reduced, off)            : /dashboard only
 *   forced colours and reduced transparency (media emulation)                      : /dashboard only
 *
 * The preference cookie makes the SERVER write the axes onto <html>, as for a returning visitor. Desktop
 * only (1280x800): the viewport axis is covered by the route specs.
 */

const MEMBER = fakeUserDto({
	first_name: 'Alice',
	last_name: 'Anderson',
	email: 'alice@acme.test',
	designation: 'Sales Lead'
});
const ADMIN = {
	tier: 'tenant-admin' as const,
	permissions: ['tenant.admin', 'identity.users.view', 'identity.roles.view']
};

interface Anchor {
	name: string;
	path: string;
	mocks: Parameters<typeof signInForVisual>[1]['mocks'];
}
const USERS = { method: 'GET', path: '/api/v1/users', status: 200 } as const;
const ROLES = { method: 'GET', path: '/api/v1/roles', status: 200, body: { roles: [] } } as const;

const DASHBOARD: Anchor = { name: 'dashboard', path: '/dashboard', mocks: [] };
const USERS_LIST: Anchor = {
	name: 'users',
	path: '/settings/users',
	mocks: [{ ...USERS, body: { users: [MEMBER], has_more: false } }, ROLES]
};
const USER_DETAIL: Anchor = {
	name: 'user-detail',
	path: `/settings/users/${MEMBER.membership_id}`,
	mocks: [
		{ method: 'GET', path: `/api/v1/users/${MEMBER.membership_id}`, status: 200, body: MEMBER },
		{ ...USERS, body: { users: [MEMBER], has_more: false } },
		ROLES
	]
};
const ANCHORS = [DASHBOARD, USERS_LIST, USER_DETAIL];

async function shoot(
	page: Page,
	anchor: Anchor,
	prefs: Partial<Preferences>,
	name: string,
	before?: () => Promise<void>
) {
	await signInForVisual(page, { ...ADMIN, mocks: anchor.mocks });
	await setPreferencesCookie(page, prefs);
	if (before) await before();
	await page.goto(anchor.path);
	await page.waitForLoadState('networkidle');
	await stabilise(page);
	await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, ...SNAPSHOT_OPTIONS });
}

/** Every non-default value of an axis. */
const others = <K extends keyof Preferences>(key: K, skip: string[] = []) =>
	PREFERENCE_VALUES[key].filter((v, i) => i > 0 && !skip.includes(v)) as Preferences[K][];

test.describe('@visual matrix: structural axes on the anchor routes', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	const STRUCTURAL = ['layout', 'navType', 'contentWidth', 'sidebar'] as const;

	for (const anchor of ANCHORS) {
		for (const axis of STRUCTURAL) {
			for (const value of others(axis)) {
				test(`${anchor.name}: ${axis} ${value}`, async ({ page }) => {
					await shoot(page, anchor, { [axis]: value }, `${anchor.name}-${axis}-${value}`);
				});
			}
		}
		test(`${anchor.name}: mode auto (the system is dark)`, async ({ page }) => {
			await shoot(page, anchor, { mode: 'auto' }, `${anchor.name}-mode-auto`, () =>
				page.emulateMedia({ colorScheme: 'dark' })
			);
		});
	}
});

test.describe('@visual matrix: colour axes on /dashboard', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	for (const value of others('palette')) {
		test(`palette ${value}`, async ({ page }) => {
			await shoot(page, DASHBOARD, { palette: value }, `dashboard-palette-${value}`);
		});
	}
	for (const value of others('sidebarColors')) {
		test(`sidebar colors ${value}`, async ({ page }) => {
			await shoot(page, DASHBOARD, { sidebarColors: value }, `dashboard-sidebar-colors-${value}`);
		});
	}
	for (const value of others('transparency')) {
		test(`transparency ${value}`, async ({ page }) => {
			await shoot(page, DASHBOARD, { transparency: value }, `dashboard-transparency-${value}`);
		});
	}
});

test.describe('@visual matrix: media emulation on /dashboard', () => {
	test.use({ viewport: { width: 1280, height: 800 } });

	test('forced colours', async ({ page }) => {
		await shoot(page, DASHBOARD, {}, 'dashboard-forced-colors', () =>
			page.emulateMedia({ forcedColors: 'active' })
		);
	});

	test('reduced transparency', async ({ page }) => {
		await shoot(page, DASHBOARD, {}, 'dashboard-reduced-transparency', async () => {
			const cdp = await page.context().newCDPSession(page);
			await cdp.send('Emulation.setEmulatedMedia', {
				features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
			});
		});
	});
});
