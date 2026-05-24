#!/usr/bin/env node
/**
 * Per-route-group +error.svelte gate (CLAUDE.md rule 8 + arch test #11).
 *
 * SvelteKit has no JS-style error boundaries; an unhandled error climbs
 * to the nearest +error.svelte. Each route group `(name)/` MUST ship
 * its own so error UI matches the surrounding layout.
 *
 * Exit code: 0 on clean, 1 if any group is missing +error.svelte.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ROUTES_DIR = join(ROOT, 'src/routes');

function findGroups(dir, prefix = '') {
	const groups = [];
	if (!existsSync(dir)) return groups;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const next = join(dir, entry.name);
		const nextRel = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
			groups.push({ path: next, rel: nextRel });
		}
		groups.push(...findGroups(next, nextRel));
	}
	return groups;
}

const groups = findGroups(ROUTES_DIR);
const missing = groups.filter((g) => !existsSync(join(g.path, '+error.svelte')));
const rootErrorExists = existsSync(join(ROUTES_DIR, '+error.svelte'));

if (missing.length === 0) {
	console.log(
		`✓ check-route-error-pages: ${groups.length} route group(s), all ship +error.svelte${rootErrorExists ? ' (+root fallback)' : ''}.`
	);
	process.exit(0);
}

console.error(
	`✗ check-route-error-pages: ${missing.length} route group(s) missing +error.svelte:\n`
);
for (const g of missing) console.error(`  src/routes/${g.rel}/+error.svelte`);
console.error(
	'\nFix: add a +error.svelte file under each route group so error UI matches its layout.'
);
process.exit(1);
