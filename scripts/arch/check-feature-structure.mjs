#!/usr/bin/env node
/**
 * Feature-structure gate (arch test #12).
 *
 * Every src/lib/features/<name>/ folder must contain:
 *   - api.ts        (gateway layer — never raw fetch in components)
 *   - index.ts      (barrel — single import surface)
 *
 * `schemas.ts` is RECOMMENDED but not all features need Zod schemas
 * (purely computed features like saved-views don't ship a DTO).
 *
 * Exit code: 0 on clean, 1 if any feature is missing api.ts or index.ts.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const FEATURES_DIR = join(ROOT, 'src/lib/features');

const features = readdirSync(FEATURES_DIR, { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => e.name);

function hasNestedApi(dir) {
	if (!existsSync(dir)) return false;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const sub = join(dir, entry.name);
		if (existsSync(join(sub, 'api.ts'))) return true;
		if (hasNestedApi(sub)) return true;
	}
	return false;
}

// Features without an HTTP surface (purely composed / computed). These
// don't ship api.ts but still need index.ts as the public barrel.
const NO_API_REQUIRED = new Set(['dashboard']);

const errors = [];
for (const f of features) {
	const dir = join(FEATURES_DIR, f);
	const hasApi = existsSync(join(dir, 'api.ts')) || hasNestedApi(dir);
	if (!hasApi && !NO_API_REQUIRED.has(f)) {
		errors.push(`features/${f}/api.ts (or any nested api.ts) missing`);
	}
	if (!existsSync(join(dir, 'index.ts'))) errors.push(`features/${f}/index.ts missing`);
}

if (errors.length === 0) {
	console.log(
		`✓ check-feature-structure: ${features.length} feature(s), all ship api.ts + index.ts.`
	);
	process.exit(0);
}

console.error(`✗ check-feature-structure: ${errors.length} structural issue(s):\n`);
for (const e of errors) console.error(`  ${e}`);
process.exit(1);
