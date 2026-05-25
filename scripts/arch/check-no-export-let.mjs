#!/usr/bin/env node
/**
 * Svelte-5 runes purity gate (arch tests #14-22).
 *
 * Catches legacy Svelte-4 patterns that the Svelte plugin doesn't always
 * surface as errors. Combined with eslint-plugin-svelte (already error-level
 * on no-reactive-reassign / button-has-type / etc.), this script scans for:
 *
 *   - `export let foo` outside <script context="module">  → use $props()
 *   - `$:` reactive blocks                                 → use $derived / $effect
 *   - `on:click` (or any `on:` directive)                  → use onclick={...}
 *   - `<slot />` / `<slot name="...">` tags                → use {@render children()}
 *   - `<svelte:component this={...}>`                      → Svelte 5 resolves natively
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const PATTERNS = [
	{
		re: /^\s*export\s+let\s+\w+/m,
		msg: 'export let — use $props() destructure for runes-mode components'
	},
	{
		re: /^\s*\$:\s*[^=]/m,
		msg: '$: reactive block — use $derived / $effect'
	},
	{
		re: /\bon:[a-z]+(?:\|[a-z]+)*\s*=/i,
		msg: 'on:event directive — use the native onevent={...} attribute'
	},
	{
		re: /<slot(\s|\/|>)/,
		msg: '<slot> tag — use {@render children()} / {@render snippet()}'
	},
	{
		re: /<svelte:component\b/,
		msg: '<svelte:component> — Svelte 5 resolves dynamic components natively'
	},
	{
		re: /\bcreateEventDispatcher\s*\(/,
		msg: 'createEventDispatcher — use callback props (Svelte 5 idiom)'
	}
];

const files = globSync('src/**/*.svelte', { cwd: ROOT });

const violations = [];
for (const rel of files) {
	const src = readFileSync(join(ROOT, rel), 'utf8');
	for (const { re, msg } of PATTERNS) {
		const m = src.match(re);
		if (m) {
			const lineNo = src.slice(0, m.index ?? 0).split('\n').length;
			violations.push(`${rel.replaceAll('\\', '/')}:${lineNo}  ${msg}`);
		}
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-no-export-let: ${files.length} .svelte file(s), no Svelte-4 legacy patterns.`
	);
	process.exit(0);
}

console.error(`✗ check-no-export-let: ${violations.length} Svelte-4 legacy pattern(s):\n`);
for (const v of violations) console.error(`  ${v}`);
process.exit(1);
