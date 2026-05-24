#!/usr/bin/env node
/**
 * No /v1/platform/* paths in feature gateways (CLAUDE.md rule 9 + arch test #45).
 *
 * Per ADR 0038 (unified endpoint surface), frontend talks to /v1/<resource>
 * paths. /v1/platform/* is reserved for genuinely platform-wide endpoints
 * (impersonation sessions, cross-tenant stats) — feature gateways for
 * tenants / users / roles / persons must NOT use /v1/platform/*.
 *
 * Allowlist: src/lib/features/operator/** is the legitimate platform-wide
 * feature — it's allowed to hit /v1/platform/*. Everywhere else, it's a bug.
 *
 * Exit code: 0 on clean, 1 on any banned path reference.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const ALLOWLIST = [
	'src/lib/features/operator/',
	// Audit feature reads cross-tenant person activity from /v1/platform/persons —
	// this is a "genuinely platform-wide operation" per CLAUDE.md rule 9.
	'src/lib/features/audit/',
	'src/lib/api/client.ts',
	'src/lib/api/errors.ts',
	'src/routes/api/operator/'
];

const files = globSync('src/lib/features/**/api.ts', { cwd: ROOT });
let violations = [];

for (const rel of files) {
	const norm = rel.replaceAll('\\', '/');
	if (ALLOWLIST.some((a) => norm.startsWith(a))) continue;
	const src = readFileSync(join(ROOT, rel), 'utf8');
	for (const m of src.matchAll(/\/v1\/platform\/[\w/-]+/g)) {
		const lineNo = src.slice(0, m.index).split('\n').length;
		violations.push(`${norm}:${lineNo}  ${m[0]}`);
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-no-platform-paths: ${files.length} feature gateway(s) checked, none use /v1/platform/*.`
	);
	process.exit(0);
}

console.error(`✗ check-no-platform-paths: ${violations.length} banned path reference(s):\n`);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: tenant/user/role/person operations go via /v1/<resource>, not /v1/platform/. Operator-scope writes the X-Tenant-Id header.'
);
process.exit(1);
