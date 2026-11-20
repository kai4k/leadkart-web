#!/usr/bin/env node
/**
 * Banned-packages gate (Phase 2 spec, plan Task 7).
 *
 * One library per concern (CLAUDE.md). These were replaced and must not come back:
 *   - `vaul-svelte`   → `ui/sheet` (the Drawer is a shim over it)
 *   - `lucide-svelte` → `@lucide/svelte`, only through the `#lib/icons` registry
 *   - `mode-watcher`  → the preferences store (`<html data-mode>`)
 * It is a violation to import any of them under `src/` or `tests/`, or to list one in
 * `package.json` (dependencies, devDependencies, peerDependencies, optionalDependencies).
 *
 * Exit code: 0 on clean, 1 on any import or dependency entry.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importSpecifiers, isPackage } from './lib/import-specifiers.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const BANNED = ['vaul-svelte', 'lucide-svelte', 'mode-watcher'];
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/** @returns {Array<{ line: number, specifier: string }>} */
export function findImportViolations(src) {
	return importSpecifiers(src).filter((i) => BANNED.some((b) => isPackage(i.specifier, b)));
}

/** @returns {string[]} the banned names listed in a package.json text. */
export function findManifestViolations(packageJson) {
	const pkg = JSON.parse(packageJson);
	return DEP_FIELDS.flatMap((field) =>
		BANNED.filter((b) => Object.hasOwn(pkg[field] ?? {}, b)).map((b) => `${field}.${b}`)
	);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const files = ['src', 'tests'].flatMap((dir) =>
		globSync(`${dir}/**/*.{ts,js,mjs,svelte}`, { cwd: ROOT })
	);
	const violations = [];
	for (const rel of files)
		for (const v of findImportViolations(readFileSync(join(ROOT, rel), 'utf8')))
			violations.push(`${rel.replaceAll('\\', '/')}:${v.line}  imports '${v.specifier}'`);
	for (const entry of findManifestViolations(readFileSync(join(ROOT, 'package.json'), 'utf8')))
		violations.push(`package.json  ${entry}`);

	if (violations.length === 0) {
		console.log(
			`✓ check-banned-packages: ${files.length} file(s) and package.json, none of ${BANNED.join(', ')}.`
		);
		process.exit(0);
	}
	console.error(`✗ check-banned-packages: ${violations.length} use(s) of a banned package:\n`);
	for (const v of violations) console.error(`  ${v}`);
	process.exit(1);
}
