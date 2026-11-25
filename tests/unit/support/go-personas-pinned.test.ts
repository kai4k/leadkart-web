/**
 * The persona builder (tests/support/go-personas.ts) copies Go's seeded roles, its implication table
 * and its platform-equivalent table. A copy drifts silently, so this reads Go's own files at the
 * commit pinned in SOURCE.json (the same `git show` mechanism as the permission-name check and
 * `npm run openapi:check`) and fails when the copy differs. Without a Go checkout the test is
 * skipped with a notice.
 *
 *   internal/identity/app/seed/role_catalog.go          DefaultRoleCatalog   -> SEEDED
 *   internal/identity/domain/permission/implication.go  platformReserved     -> PLATFORM_RESERVED
 *                                                       platformEquivalents  -> PLATFORM_EQUIVALENTS
 *                                                       IsPlatformManagedRole -> PLATFORM_MANAGED_ROLE
 *   internal/identity/ports/authn/authorize.go          superUserHolds, tenantPlaneMayHold, IsPlatformOperator (clauses)
 *   internal/identity/domain/permission/permission.go   field path -> name   (to read the two above)
 *   internal/identity/domain/role/{role,system_roles}.go  levels and role names
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import SOURCE from '#lib/api/generated/SOURCE.json';
import {
	PLATFORM_EQUIVALENTS,
	PLATFORM_MANAGED_ROLE,
	PLATFORM_RESERVED,
	SEEDED
} from '../../support/go-personas.ts';
import {
	isRequestable,
	requestablePermissions
} from '#lib/features/roles/permissions-catalogue.ts';

const goDir = resolve(process.env.LEADKART_GO_DIR ?? '../leadkart-go');
const haveGo = existsSync(join(goDir, '.git'));
if (!haveGo) {
	console.warn(`[go-personas-pinned] skipped: no leadkart-go checkout at ${goDir}`);
}

function goFile(path: string): string {
	const r = spawnSync('git', ['-C', goDir, 'show', `${SOURCE.commit}:${path}`], {
		encoding: 'utf8',
		shell: false,
		maxBuffer: 16 * 1024 * 1024
	});
	if (r.status !== 0)
		throw new Error(`cannot read ${path} at ${SOURCE.commit}: ${r.stderr.trim()}`);
	return r.stdout;
}

const stripComments = (src: string) =>
	src
		.split('\n')
		.map((l) => l.replace(/\/\/.*$/, ''))
		.join('\n');

/** `Platform.TenantsView` -> "platform.tenants.view": the nested literal of IdentityPermissions. */
function permissionPaths(src: string): Map<string, string> {
	const start = src.indexOf('}{\n\tMeta:');
	const end = src.indexOf('\nfunc allNames');
	const out = new Map<string, string>();
	const stack: string[] = [];
	for (const raw of src.slice(start + 2, end).split('\n')) {
		const line = raw.trim();
		const open = /^(\w+): \w+\{$/.exec(line);
		if (open) {
			stack.push(open[1]!);
			continue;
		}
		if (/^\},?$/.test(line)) {
			stack.pop();
			continue;
		}
		const leaf = /^(\w+):\s+"([^"]+)",?$/.exec(line);
		if (leaf) out.set([...stack, leaf[1]!].join('.'), leaf[2]!);
	}
	return out;
}

/** Every `p.A.B` atom of a Go expression, as permission names, in order. */
function names(expr: string, paths: Map<string, string>, bundles = new Map<string, string[]>()) {
	const out: string[] = [];
	for (const m of expr.matchAll(/p\.([A-Za-z.]+)|\b([a-z]\w*)\b/g)) {
		if (m[1]) {
			const name = paths.get(m[1]);
			if (!name) throw new Error(`unknown permission path p.${m[1]}`);
			out.push(name);
		} else if (m[2] && !['slices', 'string', 'p'].includes(m[2]) && m[2] !== 'Concat') {
			const bundle = bundles.get(m[2]);
			if (!bundle) throw new Error(`unknown bundle ${m[2]}`);
			out.push(...bundle);
		}
	}
	return out;
}

const sorted = (xs: Iterable<string>) => [...new Set(xs)].sort();

describe.skipIf(!haveGo)('the persona builder equals Go at the pinned commit', () => {
	const paths = haveGo
		? permissionPaths(goFile('internal/identity/domain/permission/permission.go'))
		: new Map<string, string>();

	it('reads the permission literal (the parse found every name)', () => {
		expect(paths.size).toBeGreaterThan(55);
		expect(paths.get('Meta.TenantAdmin')).toBe('tenant.admin');
		expect(paths.get('Orders.Payments.Record')).toBe('orders.payments.record');
	});

	it('seeded roles: names, levels and grants equal DefaultRoleCatalog (bundles resolved, post-loop applied)', () => {
		const roleSrc = goFile('internal/identity/domain/role/role.go');
		const levels = new Map(
			[...roleSrc.matchAll(/^\s+(HierarchyLevel\w+)\s*=\s*(\d+)/gm)].map((m) => [
				m[1]!,
				Number(m[2])
			])
		);
		const roleNames = new Map(
			[
				...goFile('internal/identity/domain/role/system_roles.go').matchAll(
					/^\s+(\w+):\s+"([^"]+)",$/gm
				)
			].map((m) => [m[1]!, m[2]!])
		);
		const src = stripComments(goFile('internal/identity/app/seed/role_catalog.go'));
		const body = src.slice(src.indexOf('func DefaultRoleCatalog'));

		const bundles = new Map<string, string[]>();
		for (const m of body.matchAll(/\b(\w+) := \[\]string\{([^}]*)\}/g)) {
			bundles.set(m[1]!, names(m[2]!, paths, bundles));
		}

		// The post-loop is code, not data: if it changes, the persona's copy of it must be revisited.
		expect(body).toContain(
			'specs[i].Permissions = slices.Concat(specs[i].Permissions, notificationsInbox)'
		);
		expect(body).toContain('if specs[i].Name != role.SystemRoles.Tenant.CompanyOwner {');
		expect(body).toContain('specs[i].Permissions = slices.Concat(specs[i].Permissions, elevation)');

		const specStart = body.indexOf('specs := []RoleSpec{');
		const specText = body.slice(specStart, body.indexOf('\n\t}\n', specStart));
		const go = new Map<string, { level: number; grants: string[] }>();
		for (const m of specText.matchAll(
			/Name:\s+role\.SystemRoles\.Tenant\.(\w+),[\s\S]*?HierarchyLevel:\s+role\.(\w+),[\s\S]*?Permissions:\s+([\s\S]*?),\n\t\t\},/g
		)) {
			const name = roleNames.get(m[1]!);
			const level = levels.get(m[2]!);
			if (name === undefined || level === undefined) throw new Error(`unresolved role ${m[1]}`);
			const grants = names(m[3]!, paths, bundles);
			grants.push(...bundles.get('notificationsInbox')!);
			if (name !== 'Company Owner') grants.push(...bundles.get('elevation')!);
			go.set(name, { level, grants: sorted(grants) });
		}

		expect(go.size).toBe(14);
		expect(sorted(Object.keys(SEEDED))).toEqual(sorted(go.keys()));
		for (const [name, expected] of go) {
			expect(SEEDED[name]!.level, `${name} level`).toBe(expected.level);
			expect(sorted(SEEDED[name]!.grants), `${name} grants`).toEqual(expected.grants);
		}
	});

	it('platformReserved equals PLATFORM_RESERVED', () => {
		const src = stripComments(goFile('internal/identity/domain/permission/implication.go'));
		const block =
			/var platformReserved = func\(\)[\s\S]*?names := \[\]string\{([\s\S]*?)\n\t\}/.exec(src);
		expect(block).not.toBeNull();
		expect(sorted(names(block![1]!, paths))).toEqual(sorted(PLATFORM_RESERVED));
	});

	it('platformEquivalents equals PLATFORM_EQUIVALENTS', () => {
		const src = stripComments(goFile('internal/identity/domain/permission/implication.go'));
		const start = src.indexOf('var platformEquivalents');
		const text = src.slice(start, src.indexOf('\n}()', start));
		const go = new Map<string, string[]>();
		for (const m of text.matchAll(/(p\.[\w.]+):\s*\{([^}]*)\}/g)) {
			go.set(names(m[1]!, paths)[0]!, sorted(names(m[2]!, paths)));
		}
		for (const m of text.matchAll(
			/range \[\]string\{([^}]*)\} \{\s*m\[n\] = \[\]string\{([^}]*)\}/g
		)) {
			for (const key of names(m[1]!, paths)) go.set(key, sorted(names(m[2]!, paths)));
		}
		expect(go.size).toBeGreaterThan(10);
		const web = new Map(Object.entries(PLATFORM_EQUIVALENTS).map(([k, v]) => [k, sorted(v)]));
		expect(sorted([...web.keys()])).toEqual(sorted([...go.keys()]));
		for (const [key, value] of go) expect(web.get(key), key).toEqual(value);
	});

	it('IsPlatformManagedRole equals PLATFORM_MANAGED_ROLE', () => {
		const src = stripComments(goFile('internal/identity/domain/permission/implication.go'));
		const fn = /func IsPlatformManagedRole\(name string\) bool \{([\s\S]*?)\n\}/.exec(src);
		expect(fn).not.toBeNull();
		const used = [...fn![1]!.matchAll(/name == p\.([A-Za-z.]+)/g)].map((m) => {
			const name = paths.get(m[1]!);
			if (!name) throw new Error(`unknown permission path p.${m[1]}`);
			return name;
		});
		expect(used.length).toBe(3);
		expect(sorted(used)).toEqual(sorted(PLATFORM_MANAGED_ROLE));
	});

	it('IsRequestable is "implied by tenant.admin and not platform-managed", and the web list agrees name by name', () => {
		const src = stripComments(goFile('internal/identity/domain/permission/implication.go'));
		expect(src.replace(/\s+/g, ' ')).toContain(
			'func IsRequestable(name string) bool { return ImpliedByTenantAdmin(name) && !IsPlatformManagedRole(name) }'
		);
		expect(src.replace(/\s+/g, ' ')).toContain(
			'func ImpliedByTenantAdmin(name string) bool { return IsKnown(name) && !IsPlatformReserved(name) }'
		);
		const go = [...paths.values()].filter(
			(n) => !PLATFORM_RESERVED.has(n) && !PLATFORM_MANAGED_ROLE.has(n)
		);
		expect(sorted(requestablePermissions().map((e) => e.name))).toEqual(sorted(go));
		for (const n of PLATFORM_MANAGED_ROLE) expect(isRequestable(n), n).toBe(false);
	});

	it('the authorize.go clauses the persona rule models are still the ones Go has', () => {
		const src = stripComments(goFile('internal/identity/ports/authn/authorize.go'));
		const squash = (s: string) => s.replace(/\s+/g, ' ');
		const text = squash(src);
		// a company super user does not hold the role-management names (only the platform tenant's)
		expect(text).toContain(
			'return c.IsSuperUser && (!permission.IsPlatformManagedRole(required) || c.TenantSlug == PlatformTenantSlug)'
		);
		// only an impersonation session or a platform operator holds them through the tenant plane
		expect(text).toMatch(
			/func tenantPlaneMayHold\(c \*jwt\.Claims, required string\) bool \{ if permission\.IsPlatformManagedRole\(required\) \{ return c\.IsImpersonation\(\) \|\| IsPlatformOperator\(c\) \}/
		);
		// an impersonation token is not a platform operator
		expect(text).toContain(
			'return c != nil && c.IsPlatform && c.TenantSlug == PlatformTenantSlug && !c.IsImpersonation()'
		);
	});

	it('mayConferManaged (authority/policy.go) is the clause `mayConferPlatformManaged` mirrors', () => {
		const src = stripComments(goFile('internal/identity/domain/authority/policy.go'));
		const text = src.replace(/\s+/g, ' ');
		// refused unless: the actor may manage roles, is not an impersonation session, is a platform operator or super
		// user, and decides in its own tenant (the web's "not inside a company's scope")
		expect(text).toContain(
			'if !a.mayManageRoles || a.impersonation || (!a.platformOperator && !a.superUser) || !sameTenant(tid, a.tenantID) {'
		);
		expect(text).toContain('ErrGrantExceedsAuthority, n)');
		// conferring only: a removal of a managed name in a company is outside the ceiling
		expect(text).toContain('if inPlatform || !permission.IsPlatformManagedRole(n) {');
	});
});
