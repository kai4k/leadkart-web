#!/usr/bin/env node
/**
 * One-shot migration for TanStack queries.ts canon-correct patterns.
 *
 * Two violations fixed across src/lib/features/**\/queries.ts:
 *
 *   1. `enabled: !!variable` → `enabled: Boolean(variable)`
 *      ESLint canon: no-implicit-coercion bans the `!!` idiom for
 *      explicit-intent boolean conversion. TanStack's docs use `!!`
 *      but our linting prefers the explicit form; both are functionally
 *      identical for the enabled flag (empty string is rejected by both).
 *
 *   2. Floating `qc.invalidateQueries(...)` / `qc.cancelQueries(...)` /
 *      `qc.refetchQueries(...)` / `qc.removeQueries(...)` calls →
 *      prefix with `void` operator.
 *
 *      ESLint canon: no-floating-promises accepts `void <promise>` as
 *      explicit intent to fire-and-forget. The MORE canonical TanStack
 *      pattern (return the promise so the mutation awaits it) is a
 *      separate UX-aware refactor — `void` is the behaviour-preserving
 *      intermediate step that satisfies the rule without changing
 *      mutation resolution semantics.
 *
 * Run once; this script stays as a reference but doesn't run in CI.
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const files = globSync('src/lib/features/**/queries.ts', { cwd: ROOT });
let touched = 0;
let bangCount = 0;
let voidCount = 0;

for (const rel of files) {
	const abs = join(ROOT, rel);
	const src = readFileSync(abs, 'utf8');
	let next = src;

	// 1. !!variable → Boolean(variable) — but only in `enabled:` contexts
	//    to avoid changing other intentional !! usages.
	next = next.replace(/(\benabled:\s*)!!(\w+)/g, (_m, prefix, name) => {
		bangCount += 1;
		return `${prefix}Boolean(${name})`;
	});

	// 2. Bare `qc.<async-cache-method>(` not preceded by await / return /
	//    void / .then( / `Promise.all([` → prefix with `void`.
	//    Match qc.invalidateQueries, qc.cancelQueries, qc.refetchQueries,
	//    qc.removeQueries, qc.resetQueries, qc.prefetchQuery —
	//    all return Promise<void>.
	const methods =
		'invalidateQueries|cancelQueries|refetchQueries|removeQueries|resetQueries|prefetchQuery';
	const re = new RegExp(`(^|\\n)(\\s*)(qc\\.(?:${methods})\\()`, 'g');
	next = next.replace(re, (match, lineStart, indent, call) => {
		// Inspect what's just before this call to skip already-handled cases.
		// Look at the preceding non-whitespace token in the same statement.
		const idxBefore = next.lastIndexOf(match) - 1;
		// Cheap heuristic — walk backwards through previous chars on the
		// same logical line. If we see `await`, `return`, `void`, `(`,
		// `,`, `[`, or `=` immediately preceding the call, skip.
		// Otherwise it's a bare statement → add `void `.
		let look = idxBefore;
		while (look >= 0 && /\s/.test(next[look])) look -= 1;
		if (look < 0) {
			voidCount += 1;
			return `${lineStart}${indent}void ${call}`;
		}
		const tail = next.slice(Math.max(0, look - 10), look + 1);
		if (/(await|return|void|,|\(|\[|=>|=\s*$)$/.test(tail) || tail.endsWith('Promise.all(')) {
			return match; // already handled
		}
		voidCount += 1;
		return `${lineStart}${indent}void ${call}`;
	});

	if (next !== src) {
		writeFileSync(abs, next);
		touched += 1;
		console.log('migrated:', rel.replaceAll('\\', '/'));
	}
}

console.log(
	`\nDone — ${touched} file(s) migrated; ${bangCount} !!→Boolean conversion(s); ${voidCount} void-prefix(es).`
);
