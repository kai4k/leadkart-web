/**
 * The server route guard over the real `(app)` route tree.
 *
 * ONE guard (`guardAppRoute`) reads ONE table (`nav.ts`). These tests walk
 * `src/routes/(app)` so a page added without an entry in the nav table, or
 * outside a guarded layout, fails here; then run every persona × tenant
 * context × page through the guard and compare it with what the sidebar shows.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canSee, routeForPath, visibleNav } from '#lib/config/nav.ts';
import { guardAppRoute, pathForRouteId } from '#lib/server/guards.ts';
import {
	NEW_TENANT_ADMIN,
	OPERATOR_ONE_PERMISSION,
	OWNER,
	persona,
	READ_ONLY_GRANTS,
	SALES_EXECUTIVE,
	SALES_MANAGER,
	SUPER_USER,
	TEAM_LEAD,
	caps
} from '../../support/go-personas.ts';
import { createAnalysis } from '../../support/server-file-guards.ts';

const APP_DIR = join(process.cwd(), 'src/routes/(app)');
const PAGE_FILES = ['+page.svelte', '+page.ts', '+page.server.ts'];

/**
 * Pages deliberately outside the guard, each with the reason. Keep this list
 * short: a page here is reachable by every signed-in user.
 */
const PINNED_EXCEPTIONS: Record<string, string> = {
	'/(app)/must-change-password':
		'The (app) layout sends every user with the forced-change flag here; it has no permission and no nav entry.'
};

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) out.push(...walk(join(dir, entry.name)));
	}
	out.push(dir);
	return out;
}

/** Route id (`/(app)/settings/users/[id]`) of every directory under (app) that holds a page. */
function pageRouteIds(): string[] {
	return walk(APP_DIR)
		.filter((dir) => PAGE_FILES.some((f) => existsSync(join(dir, f))))
		.map(
			(dir) =>
				`/(app)${relative(APP_DIR, dir)
					.split(sep)
					.join('/')
					.replace(/^(?=.)/, '/')}`
		)
		.sort();
}

/** Every layout/page server file of the tree, read as one program: "guarded" is decided on the syntax tree. */
function serverFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory()
			? serverFiles(join(dir, e.name))
			: /\+(page|layout)\.server\.ts$/.test(e.name)
				? [join(dir, e.name)]
				: []
	);
}
const analysis = createAnalysis(serverFiles(APP_DIR));

/**
 * Is `export const load = guardAppRoute` (the real one, resolved by the type checker, never a name in
 * a comment or a local stub) exported from a layout/page server file on the way down to this page?
 */
function isGuarded(routeId: string): boolean {
	const segments = routeId.split('/').slice(2); // drop '' and '(app)'
	for (let depth = segments.length; depth >= 1; depth--) {
		const dir = join(APP_DIR, ...segments.slice(0, depth));
		for (const f of ['+layout.server.ts', '+page.server.ts']) {
			const file = join(dir, f);
			if (existsSync(file) && analysis.isSharedGuard(file)) return true;
		}
	}
	return false;
}

const GUARDED_IDS = pageRouteIds().filter((id) => !(id in PINNED_EXCEPTIONS));

describe('the (app) route tree', () => {
	it('finds the pages', () => {
		expect(pageRouteIds().length).toBeGreaterThan(25);
	});

	it.each(GUARDED_IDS)('%s resolves to a nav entry', (id) => {
		expect(routeForPath(pathForRouteId(id)), id).not.toBeNull();
	});

	it.each(GUARDED_IDS)('%s is under a guardAppRoute layout', (id) => {
		expect(isGuarded(id), id).toBe(true);
	});

	it('a comment, a string or a local stub that names guardAppRoute does not count as the guard', () => {
		const dir = join(APP_DIR, '__synthetic_guard__');
		const comment = join(dir, 'comment', '+layout.server.ts');
		const stub = join(dir, 'stub', '+layout.server.ts');
		const real = join(dir, 'real', '+layout.server.ts');
		const local = createAnalysis([], {
			[comment]:
				'// export const load = guardAppRoute;\nexport const load = async () => ({ note: "guardAppRoute" });',
			[stub]: 'const guardAppRoute = async () => {};\nexport const load = guardAppRoute;',
			[real]:
				"import { guardAppRoute } from '#lib/server/guards.ts';\nexport const load = guardAppRoute;"
		});
		expect(local.isSharedGuard(comment)).toBe(false);
		expect(local.isSharedGuard(stub)).toBe(false);
		expect(local.isSharedGuard(real)).toBe(true);
	});

	it('pinned exceptions name real pages and are really unguarded', () => {
		for (const id of Object.keys(PINNED_EXCEPTIONS)) {
			expect(pageRouteIds()).toContain(id);
			expect(isGuarded(id), id).toBe(false);
			expect(PINNED_EXCEPTIONS[id]).toBeTruthy();
		}
	});
});

const PERSONAS = {
	owner: OWNER,
	'new-tenant admin': NEW_TENANT_ADMIN,
	'read-only grants (no tenant.admin)': persona({ grants: READ_ONLY_GRANTS }),
	'sales manager': SALES_MANAGER,
	'team lead': TEAM_LEAD,
	'sales executive': SALES_EXECUTIVE,
	'operator, one permission': OPERATOR_ONE_PERMISSION,
	'super user': SUPER_USER,
	'no permissions': caps([])
};

async function outcome(
	routeId: string,
	capabilities: unknown,
	inTenantContext: boolean
): Promise<string> {
	try {
		await guardAppRoute({
			route: { id: routeId },
			parent: () => Promise.resolve({ capabilities, inTenantContext })
		} as never);
		return 'allowed';
	} catch (e) {
		const err = e as { status: number; location?: string };
		return err.location ? `${err.status} ${err.location}` : `${err.status}`;
	}
}

describe('guard matrix: persona x tenant context x page = what the nav shows', () => {
	for (const [name, persona] of Object.entries(PERSONAS)) {
		// Only a platform operator can act inside a tenant; a member never has that state.
		for (const inTenantContext of persona.is_platform ? [false, true] : [false]) {
			it(`${name}, ${inTenantContext ? 'in' : 'out of'} tenant context`, async () => {
				const listed = new Set(
					visibleNav(persona, inTenantContext).flatMap((s) => s.items.map((i) => i.href))
				);
				for (const id of GUARDED_IDS) {
					const entry = routeForPath(pathForRouteId(id))!;
					const expected = entry.hidden
						? canSee(persona, entry, inTenantContext)
						: listed.has(entry.href);
					const got = await outcome(id, persona, inTenantContext);
					expect(got === 'allowed', `${name} ctx=${inTenantContext} ${id} -> ${got}`).toBe(
						expected
					);
					if (!expected)
						expect(got).toMatch(/^303 \/(dashboard|operator\/tenants|operator\/scope\/profile)$/);
				}
			});
		}
	}
});

describe('guard matrix: explicit expectations (independent of nav.ts)', () => {
	const allowedIds = async (persona: unknown, inTenantContext: boolean) => {
		const ids: string[] = [];
		for (const id of GUARDED_IDS)
			if ((await outcome(id, persona, inTenantContext)) === 'allowed') ids.push(id);
		return ids.map((id) => id.replace('/(app)', ''));
	};
	const ACCOUNT = [
		'/settings/account',
		'/settings/account/activity',
		'/settings/account/profile',
		'/settings/account/security',
		'/settings/account/sessions'
	];

	it('sales executive: CRM, orders, permission requests, account (Go gives it no inventory)', async () => {
		expect(await allowedIds(SALES_EXECUTIVE, false)).toEqual(
			[
				'/dashboard',
				'/leads',
				'/leads/[id]',
				'/orders',
				'/orders/[id]',
				'/permission-requests',
				'/permission-requests/[id]',
				...ACCOUNT
			].sort()
		);
	});

	it('existing-tenant admin with the read bundle: lists but not roles/new, no inventory', async () => {
		expect(await allowedIds(persona({ grants: READ_ONLY_GRANTS }), false)).toEqual(
			[
				'/dashboard',
				'/leads',
				'/leads/[id]',
				'/orders',
				'/orders/[id]',
				'/permission-requests',
				'/permission-requests/[id]',
				'/settings/roles',
				'/settings/roles/[id]',
				'/settings/tenant',
				'/settings/tenant/contact',
				'/settings/tenant/preferences',
				'/settings/tenant/profile',
				'/settings/tenant/security',
				'/settings/tenant/statutory',
				'/settings/users',
				'/settings/users/[id]',
				'/settings/users/hierarchy',
				...ACCOUNT
			].sort()
		);
	});

	it('operator with platform.tenants.view only: the tenant list; the scope tree only inside a context', async () => {
		expect(await allowedIds(OPERATOR_ONE_PERMISSION, false)).toEqual(
			[
				'/dashboard',
				// Go adds identity.tenants.view for platform.tenants.view: the operator's own tenant page.
				'/settings/tenant',
				'/settings/tenant/contact',
				'/settings/tenant/preferences',
				'/settings/tenant/profile',
				'/settings/tenant/security',
				'/settings/tenant/statutory',
				'/operator/tenants',
				'/permission-requests',
				'/permission-requests/[id]',
				...ACCOUNT
			].sort()
		);
		expect(await allowedIds(OPERATOR_ONE_PERMISSION, true)).toEqual(
			[
				'/dashboard',
				'/operator/scope',
				'/operator/scope/activity',
				'/operator/scope/profile',
				'/operator/scope/settings',
				'/operator/tenants',
				...ACCOUNT
			].sort()
		);
	});

	it('an owner outside any context sees no operator page', async () => {
		const ids = await allowedIds(OWNER, false);
		expect(ids.filter((id) => id.startsWith('/operator'))).toEqual([]);
		// Roles are written by LeadKart only (ADR 0073 addendum): no company owner reaches the create page.
		expect(ids).not.toContain('/settings/roles/new');
	});

	it('an owner has no tenant context to act in: own-tenant pages close in it', async () => {
		const ids = await allowedIds(OWNER, true);
		expect(
			ids.filter(
				(id) =>
					id.startsWith('/settings/') &&
					!id.startsWith('/settings/account') &&
					!id.startsWith('/settings/roles/new')
			)
		).toEqual([]);
		expect(ids).not.toContain('/permission-requests');
		expect(await outcome('/(app)/settings/users', OWNER, true)).toBe('303 /operator/scope/profile');
		// The create form exists in either context (an operator with platform.roles.manage may use it);
		// an owner's own-tenant identity.roles.create does not count there, so it is simply not theirs.
		expect(await outcome('/(app)/settings/roles/new', OWNER, true)).toBe('303 /dashboard');
	});

	it('a caller with no permissions reaches the dashboard, permission requests (open to every member) and the account pages', async () => {
		expect(await allowedIds(caps([]), false)).toEqual(
			['/dashboard', '/permission-requests', '/permission-requests/[id]', ...ACCOUNT].sort()
		);
	});
});
