#!/usr/bin/env node
/**
 * No-class-stores gate (Svelte 5 canon).
 *
 * CLAUDE.md rule 4 mandates `*.svelte.ts` files as the canonical
 * extension for runes-backed shared state, and rule 4 now further
 * mandates the **factory pattern** — a function returning an object
 * with getter accessors closing over `$state` / `$derived`. Class
 * syntax in `*.svelte.ts` is a React/TS-OOP shape that we explicitly
 * reject (see the Q&A in PR #?? — "Svelte canon vs React canon").
 *
 * Allowed exceptions:
 *   - `class X extends Error` (typed API error subclasses).
 *   - The two error helpers in `src/lib/api/errors.ts` (not a
 *     reactive store; lives outside `*.svelte.ts`).
 *
 * Scope: `src/**\/*.svelte.ts` files.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const files = globSync('src/**/*.svelte.ts', {
	cwd: ROOT,
	exclude: ['src/lib/api/generated/**']
});

const violations = [];
for (const rel of files) {
	const src = readFileSync(join(ROOT, rel), 'utf8');
	// Match `class Name` at the start of a line (with optional `export`).
	// Allow `class X extends Error` (typed error subclasses).
	const classMatches = [...src.matchAll(/^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/gm)];
	for (const m of classMatches) {
		const lineNo = src.slice(0, m.index).split('\n').length;
		const lineStart = src.lastIndexOf('\n', m.index) + 1;
		const lineEnd = src.indexOf('\n', m.index);
		const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
		// Skip lines in JSDoc comments (` * `).
		if (/^\s*\*/.test(line)) continue;
		// Skip Error subclasses.
		if (/extends\s+(Error|ApiError|\w*Error)\b/.test(line)) continue;
		violations.push(`${rel.replaceAll('\\', '/')}:${lineNo}  ${line.trim()}`);
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-no-class-stores: ${files.length} .svelte.ts file(s) scanned, all use factory pattern (Svelte canon).`
	);
	process.exit(0);
}

console.error(
	`✗ check-no-class-stores: ${violations.length} class declaration(s) in .svelte.ts files:\n`
);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: convert to a factory function returning an object with getter accessors closing over `$state`/`$derived`. CLAUDE.md rule 4 — Svelte canon over React/TS-OOP.'
);
process.exit(1);
