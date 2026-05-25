#!/usr/bin/env node
/**
 * Token-completeness gate (arch test #134).
 *
 * Every `var(--name)` reference in the codebase must resolve to a
 * `--name:` declaration in either src/styles/tokens.css (canonical),
 * src/styles/*.css (layout / utility helper tokens), or the same
 * file (component-local CSS custom properties — common pattern for
 * animation transforms, grid templates, etc.).
 *
 * Catches typos like `var(--color-fg-mute)` that don't fail at
 * parse-time but render as inherited/initial at runtime.
 *
 * Exit code: 0 on clean, 1 on any undefined token reference.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// 1. Collect global tokens from src/styles/*.css.
const globalTokens = new Set();
for (const rel of globSync('src/styles/*.css', { cwd: ROOT })) {
	const src = readFileSync(join(ROOT, rel), 'utf8');
	for (const m of src.matchAll(/--([\w-]+)\s*:/g)) globalTokens.add(m[1]);
}

// 2. Tailwind 4 + bits-ui + browser-synthesised custom properties.
const SYNTHETIC_PREFIXES = [
	'tw-',
	'bits-',
	'radix-',
	'sf-',
	// SvelteKit / vite HMR internals
	'sveltekit-',
	'vite-'
];
const SYNTHETIC_EXACT = new Set([
	'safe-area-inset-top',
	'safe-area-inset-bottom',
	'safe-area-inset-left',
	'safe-area-inset-right'
]);

// 3. Animation / dynamic-style placeholder prefixes (component-local).
const DYNAMIC_PREFIXES = ['lk-', 'enter-', 'exit-', 'leave-'];

function isAllowed(name, localTokens) {
	if (globalTokens.has(name)) return true;
	if (localTokens.has(name)) return true;
	if (SYNTHETIC_EXACT.has(name)) return true;
	if (SYNTHETIC_PREFIXES.some((p) => name.startsWith(p))) return true;
	if (DYNAMIC_PREFIXES.some((p) => name.startsWith(p))) return true;
	// Single-letter / two-letter axis names commonly used inline as
	// dynamic style binds (--x, --y, --c1, --c2, --len, --rot, --scale, --delay).
	if (/^[a-z]{1,2}\d?$/.test(name)) return true;
	if (
		[
			'x',
			'y',
			'len',
			'rot',
			'scale',
			'delay',
			'push-x',
			'push-y',
			'c1',
			'c2',
			'c3',
			'duration',
			'progress'
		].includes(name)
	)
		return true;
	return false;
}

// Skip pure placeholder strings that show up in template literals or
// comments (e.g. `var(--color-)` in a styleguide example, `var(--z-X)`).
function isPlaceholder(name) {
	if (/[A-Z]/.test(name)) return true; // ALL_CAPS or PascalCase
	if (name.endsWith('-')) return true; // trailing hyphen
	if (name === '') return true;
	return false;
}

const SCAN_GLOB = ['src/**/*.css', 'src/**/*.svelte', 'src/**/*.ts', 'src/**/*.html'];

const undefinedRefs = [];
for (const pattern of SCAN_GLOB) {
	const files = globSync(pattern, {
		cwd: ROOT,
		exclude: ['src/lib/api/generated/**', 'src/styles/tokens.css']
	});
	for (const rel of files) {
		const abs = join(ROOT, rel);
		const src = readFileSync(abs, 'utf8');

		// Collect file-local --name: declarations (including <style> blocks).
		const localTokens = new Set();
		for (const m of src.matchAll(/--([\w-]+)\s*:/g)) localTokens.add(m[1]);

		// var() pattern with optional fallback expression. The `(?:,...)`
		// match captures the comma — if present, this is a cascade-override
		// slot (parent can set --foo, otherwise use the fallback), which is
		// legitimately a tokenless reference.
		for (const m of src.matchAll(/var\(\s*--([\w-]+)\s*(,)?/g)) {
			const name = m[1];
			const hasFallback = m[2] === ',';
			if (isPlaceholder(name)) continue;
			if (hasFallback) continue; // cascade-override slot — see comment above
			if (!isAllowed(name, localTokens)) {
				const lineNo = src.slice(0, m.index).split('\n').length;
				undefinedRefs.push({ file: rel.replaceAll('\\', '/'), line: lineNo, name });
			}
		}
	}
}

if (undefinedRefs.length === 0) {
	console.log(
		`✓ check-tokens: ${globalTokens.size} global token(s) defined, every var(--*) reference resolves.`
	);
	process.exit(0);
}

console.error(`✗ check-tokens: ${undefinedRefs.length} undefined token reference(s):\n`);
for (const ref of undefinedRefs) {
	console.error(`  ${ref.file}:${ref.line}  var(--${ref.name})`);
}
console.error(
	'\nFix: add the token to src/styles/tokens.css, OR correct the typo, OR declare it file-locally (e.g. inside a <style> block).'
);
process.exit(1);
