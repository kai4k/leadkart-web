/**
 * `P` (the web's permission names) is checked against the catalogue list, and the
 * catalogue list against Go's own file at the commit pinned in SOURCE.json — the
 * same `git show` mechanism `npm run openapi:check` uses. Without a Go checkout the
 * Go comparison is skipped with a notice (the P-vs-list tests always run).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import SOURCE from '#lib/api/generated/SOURCE.json';
import { ACTION, P } from '#lib/features/auth/permissions.ts';
import {
	PERMISSION_CATALOGUE,
	PLATFORM_RESERVED,
	requestablePermissions,
	unchangeablePermissions
} from '#lib/features/roles/permissions-catalogue.ts';

const GO_FILE = 'internal/identity/domain/permission/permission.go';
const goDir = resolve(process.env.LEADKART_GO_DIR ?? '../leadkart-go');

/** Go's permission names at the pinned commit, or null when there is no checkout / commit. */
function goCatalogue(): string[] | null {
	if (!existsSync(join(goDir, '.git'))) return null;
	const r = spawnSync('git', ['-C', goDir, 'show', `${SOURCE.commit}:${GO_FILE}`], {
		encoding: 'utf8',
		shell: false,
		maxBuffer: 16 * 1024 * 1024
	});
	if (r.status !== 0) {
		throw new Error(`cannot read ${GO_FILE} at ${SOURCE.commit}: ${r.stderr.trim()}`);
	}
	// Values of the IdentityPermissions literal: `    TenantsView: "platform.tenants.view",`
	const names = [...r.stdout.matchAll(/^\s+[A-Za-z]+:\s+"([a-z_]+(?:\.[a-z_]+)+)",?\s*$/gm)].map(
		(m) => m[1]!
	);
	return names;
}

const names = PERMISSION_CATALOGUE.map((e) => e.name);

describe('P', () => {
	it('has only names that are in the catalogue list', () => {
		const known = new Set(names);
		const missing = Object.entries(P).filter(([, name]) => !known.has(name));
		expect(missing).toEqual([]);
	});

	it('has no duplicate names', () => {
		const values = Object.values(P);
		expect(new Set(values).size).toBe(values.length);
	});

	it('does not carry tenant.admin: the web never authorises on it', () => {
		expect(Object.values(P)).not.toContain('tenant.admin');
	});
});

describe('catalogue list', () => {
	it('has no duplicates', () => {
		expect(new Set(names).size).toBe(names.length);
	});

	const go = goCatalogue();
	if (go === null) {
		console.warn(
			`[permissions.test] skipped: no leadkart-go checkout at ${goDir} (set LEADKART_GO_DIR)`
		);
	}
	it.skipIf(go === null)('equals Go catalogue at the pinned commit', () => {
		expect(go!.length).toBeGreaterThan(40); // the parse found the literal
		expect([...names].sort()).toEqual([...go!].sort());
	});
});

describe("PLATFORM_RESERVED (Go's platformReserved)", () => {
	it('holds only catalogue names, tenant.admin among them', () => {
		for (const name of PLATFORM_RESERVED) expect(names, name).toContain(name);
		expect(PLATFORM_RESERVED.has('tenant.admin')).toBe(true);
	});

	it.skipIf(!existsSync(join(goDir, '.git')))(
		'has as many names as Go lists at the pinned commit',
		() => {
			const r = spawnSync(
				'git',
				[
					'-C',
					goDir,
					'show',
					`${SOURCE.commit}:internal/identity/domain/permission/implication.go`
				],
				{ encoding: 'utf8', shell: false }
			);
			expect(r.status).toBe(0);
			const from = r.stdout.indexOf('names := []string{');
			const block = r.stdout.slice(from, r.stdout.indexOf('}', from));
			// one `p.Group.Name` per reserved permission
			const listed = block.split('p.').length - 1;
			expect(listed).toBeGreaterThan(10);
			expect(PLATFORM_RESERVED.size).toBe(listed);
		}
	);

	it('a permission request can be for anything else, and for nothing reserved', () => {
		const offered = requestablePermissions().map((e) => e.name);
		expect(offered).toContain('crm.leads.assign');
		expect(offered).toContain('identity.users.create');
		for (const name of PLATFORM_RESERVED) expect(offered).not.toContain(name);
		expect(offered.length).toBe(names.length - PLATFORM_RESERVED.size);
		// the examples the forms used to show are not permissions at all
		expect(names).not.toContain('crm.leads.reassign');
		expect(names).not.toContain('crm.leads.delete');
	});
});

describe('unchangeablePermissions (Go refuses a changed name the caller does not hold)', () => {
	const reasons = { reserved: 'reserved', notHeld: 'not held' };

	it('a name the caller holds is never refused; an unheld one says why', () => {
		const held = new Set(['crm.leads.read', 'tenant.admin']);
		const refused = unchangeablePermissions((n) => held.has(n), reasons);
		expect(refused['crm.leads.read']).toBeUndefined();
		expect(refused['tenant.admin']).toBeUndefined();
		expect(refused['crm.leads.assign']).toBe('not held');
		expect(refused['platform.tenants.manage']).toBe('reserved');
		expect(refused['identity.tenants.suspend']).toBe('reserved');
	});

	it('a caller who holds everything (a super user) is refused nothing', () => {
		expect(unchangeablePermissions(() => true, reasons)).toEqual({});
	});
});

describe('ACTION', () => {
	it('carries only names that exist in P', () => {
		const known = new Set<string>(Object.values(P));
		for (const [action, list] of Object.entries(ACTION)) {
			for (const name of list) expect(known.has(name), `${action}: ${name}`).toBe(true);
		}
	});

	it('is any-of identity.* plus the platform.* equivalent Go accepts for the same route', () => {
		expect(ACTION.userCreate).toEqual([
			'identity.users.create',
			'platform.users.create',
			'platform.users.manage'
		]);
		expect(ACTION.userDeactivate).toEqual(['identity.users.deactivate', 'platform.users.manage']);
		expect(ACTION.roleAssign).toEqual(['identity.roles.assign', 'platform.roles.manage']);
		expect(ACTION.roleDelete).toEqual(['identity.roles.manage', 'platform.roles.manage']);
		expect(ACTION.requestSubmit).toEqual(['identity.meta.request_permission_elevation']);
	});

	it('never names tenant.admin', () => {
		for (const list of Object.values(ACTION)) expect(list).not.toContain('tenant.admin');
	});
});
