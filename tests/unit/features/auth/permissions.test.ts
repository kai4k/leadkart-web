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
import { PERMISSION_CATALOGUE } from '#lib/features/roles/permissions-catalogue.ts';

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
		expect(ACTION.roleDelete).toEqual(['identity.roles.delete', 'platform.roles.manage']);
		expect(ACTION.requestSubmit).toEqual(['identity.meta.request_permission_elevation']);
	});

	it('never names tenant.admin', () => {
		for (const list of Object.values(ACTION)) expect(list).not.toContain('tenant.admin');
	});
});
