#!/usr/bin/env node
/**
 * True critical-path bundle measurement (FAANG / Svelte canon).
 *
 * size-limit's path-based glob (`chunks/**\/*.js`) overcounts because it
 * sweeps every Vite chunk into the metric — including the per-route
 * `nodes/*.js` chunks SvelteKit loads dynamically and the `vendor-*`
 * chunks our manualChunks config defers. That measurement reads BIG
 * but doesn't reflect what the browser actually downloads synchronously
 * before first interactive paint.
 *
 * This script reads `.svelte-kit/output/client/.vite/manifest.json`,
 * walks the static-import chain from the SvelteKit entry, sums the
 * gzipped byte size of those files, and compares against `MAX_CRITICAL_KB`.
 *
 * What this measures = the Lighthouse "Reduce unused JavaScript" metric:
 *   - entry/app.js (the SvelteKit bootstrap)
 *   - chunks/ files imported via STATIC `import` from the entry chain
 *
 * What this excludes (correctly):
 *   - per-route `nodes/N.js` (dynamic-imported by SvelteKit's loader)
 *   - `vendor-bits-form`, `vendor-bits-data`, `vendor-zod`, `vendor-forms`,
 *     `vendor-tanstack` (deferred via manualChunks in vite.config.ts)
 *   - lazy-loaded compounds (CommandPalette, SettingsModal)
 *
 * Reference: Svelte team benchmarks at https://svelte.dev/blog show
 * canonical SvelteKit apps ship 80-120 KB gz initial JS.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BUILD_DIR = join(ROOT, 'build/client');
const MANIFEST = join(ROOT, '.svelte-kit/output/client/.vite/manifest.json');

// Critical path budget — Svelte canon. kit.svelte.dev ships ~80 KB,
// svelte.dev ~100 KB. We target <= 120 KB to leave headroom for app
// growth without sliding off the canon baseline.
const MAX_CRITICAL_KB = 120;

if (!existsSync(MANIFEST)) {
	console.error('Manifest not found. Run `npm run build` first.');
	process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

function collectStaticChain(entryKey, visited = new Set()) {
	if (visited.has(entryKey)) return visited;
	visited.add(entryKey);
	const entry = manifest[entryKey];
	if (!entry) return visited;
	for (const imp of entry.imports ?? []) {
		collectStaticChain(imp, visited);
	}
	return visited;
}

const entryKey = '.svelte-kit/generated/client-optimized/app.js';
const chain = collectStaticChain(entryKey);

const files = [];
for (const key of chain) {
	const entry = manifest[key];
	if (!entry?.file) continue;
	const path = join(BUILD_DIR, entry.file);
	if (!existsSync(path)) continue;
	const sz = gzipSync(readFileSync(path)).length;
	files.push({ path: entry.file, size: sz });
}

files.sort((a, b) => b.size - a.size);
const total = files.reduce((s, f) => s + f.size, 0);
const totalKb = total / 1024;
const overBudget = totalKb > MAX_CRITICAL_KB;

console.log(`\nCritical path (entry + static-imported chunks):`);
console.log('─'.repeat(60));
for (const f of files) {
	console.log(`  ${(f.size / 1024).toFixed(1).padStart(6)} KB  ${f.path}`);
}
console.log('─'.repeat(60));
console.log(
	`  Total: ${totalKb.toFixed(1)} KB gzipped  (budget: ${MAX_CRITICAL_KB} KB) ${overBudget ? '❌' : '✓'}\n`
);

if (overBudget) {
	console.error(
		`Critical path exceeds budget by ${(totalKb - MAX_CRITICAL_KB).toFixed(1)} KB.\n` +
			`Defer non-essential deps via manualChunks in vite.config.ts.\n`
	);
	process.exit(1);
}
