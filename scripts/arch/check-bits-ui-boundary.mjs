#!/usr/bin/env node
/**
 * bits-ui boundary gate (Phase 2 spec, plan Task 7).
 *
 * bits-ui, the headless primitive library, is imported ONLY under `src/lib/components/ui/**`
 * (the regenerated shadcn-svelte primitives and the LeadKart composites that wrap it). Everything
 * else (form components, features, layouts, routes, tests) composes the `ui/*` components, so
 * one place owns the library and its upgrades. A feature that needs a primitive that does not
 * exist yet adds it under `ui/`.
 *
 * Scanned: `src/**` and `tests/**` (`.ts`, `.js`, `.mjs`, `.svelte`), read from the import syntax.
 * The allowed zone is the one directory. The only exempt file is the gate's own self-test, whose
 * fixtures spell out the imports the gate must refuse (a `import('bits-ui')` inside a string is
 * not distinguishable from a real one without a full parser).
 *
 * Exit code: 0 on clean, 1 on any import of `bits-ui` (or a subpath) outside the zone.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importSpecifiers, isPackage } from './lib/import-specifiers.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const ALLOWED_DIR = 'src/lib/components/ui/';
export const EXEMPT_FILES = {
	'tests/unit/contract/arch-ui-boundaries.test.ts': 'fixtures of the gate self-test'
};

/** @returns {Array<{ line: number, specifier: string }>} the bits-ui imports that are not allowed in `rel`. */
export function findViolations(rel, src) {
	const path = rel.replaceAll('\\', '/');
	if (path.startsWith(ALLOWED_DIR) || path in EXEMPT_FILES) return [];
	return importSpecifiers(src).filter((i) => isPackage(i.specifier, 'bits-ui'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const files = ['src', 'tests'].flatMap((dir) =>
		globSync(`${dir}/**/*.{ts,js,mjs,svelte}`, { cwd: ROOT })
	);
	const violations = [];
	for (const rel of files)
		for (const v of findViolations(rel, readFileSync(join(ROOT, rel), 'utf8')))
			violations.push(`${rel.replaceAll('\\', '/')}:${v.line}  imports '${v.specifier}'`);

	if (violations.length === 0) {
		console.log(
			`✓ check-bits-ui-boundary: ${files.length} file(s), bits-ui is imported only under ${ALLOWED_DIR}.`
		);
		process.exit(0);
	}
	console.error(
		`✗ check-bits-ui-boundary: ${violations.length} bits-ui import(s) outside ${ALLOWED_DIR}:\n`
	);
	for (const v of violations) console.error(`  ${v}`);
	console.error(`\nCompose a ui/* component, or add the primitive under ${ALLOWED_DIR}.`);
	process.exit(1);
}
