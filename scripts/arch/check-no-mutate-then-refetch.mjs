#!/usr/bin/env node
/**
 * No-mutate-then-refetch gate (CLAUDE.md rule 11 + ADR 0038 + arch test #7).
 *
 * Mutations return the updated DTO. The response IS the refetch. The
 * pattern `await mutate(...); await refetch(...)` is forbidden — wastes
 * a round-trip + introduces a race window where the UI can render stale
 * data between the mutation success and the refetch resolving.
 *
 * This script grep-scans feature components for the suspicious sequence:
 *   any-await-call(...)  ;
 *   await refetch(...)
 *   |
 *   await invalidate(...)    (SvelteKit invalidate is also bad here)
 *   |
 *   await load(...)
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Multiline pattern (inline-applied below): any `await <ident>` followed
// by `await refetch` / `await invalidate(All)` / `await reload` on the
// next non-blank line. Lifted out to a top-level RegExp prevents repeat
// compilation across the iteration; left inline here so the construction
// stays close to the consumer.

const files = globSync('src/lib/features/**/*.{ts,svelte}', {
	cwd: ROOT,
	exclude: ['src/lib/features/**/*.test.ts']
});

const violations = [];
for (const rel of files) {
	const src = readFileSync(join(ROOT, rel), 'utf8');
	for (const m of src.matchAll(
		/await\s+(\w+)\s*\([^)]*\)\s*;?\s*\n[^\n]*?await\s+(refetch|invalidate(?:All)?|reload)\b/g
	)) {
		const lineNo = src.slice(0, m.index).split('\n').length;
		const what = m[1];
		// Heuristic exemption: if the first await is itself `refetch` / `invalidate` /
		// `load` (i.e. two sequential refetches), it's noise not a mutate+refetch.
		if (/^(refetch|invalidate|reload|load|fetch|query)/i.test(what)) continue;
		violations.push(
			`${rel.replaceAll('\\', '/')}:${lineNo}  await ${what}(...) → await ${m[2]}(...)`
		);
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-no-mutate-then-refetch: ${files.length} feature file(s), no mutate+refetch pattern.`
	);
	process.exit(0);
}

console.error(
	`✗ check-no-mutate-then-refetch: ${violations.length} probable mutate+refetch pair(s):\n`
);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: mutations return 200+DTO (ADR 0038). Use the response, OR setQueryData on the result, OR useOptimisticMutation. Never await mutate() then await refetch().'
);
process.exit(1);
