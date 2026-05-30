#!/usr/bin/env node
/**
 * No-direct-fetch gate (CLAUDE.md rule 6, arch test #2).
 *
 * Direct fetch() calls in components / features / hooks are forbidden.
 * The only legitimate fetch() sites are:
 *   - src/lib/api/client.ts (the API client itself)
 *   - src/routes/**\/+server.ts (BFF route handlers)
 *   - src/routes/**\/+page.server.ts, +layout.server.ts
 *   - src/hooks.server.ts
 *
 * ESLint covers most of this already, but ESLint's no-restricted-globals
 * misses the `event.fetch(...)` SvelteKit pattern AND the `globalThis.fetch`
 * indirection — this script catches both via regex.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const ALLOWED_PREFIXES = [
	'src/lib/api/',
	'src/routes/api/',
	'src/hooks.server.ts',
	'src/hooks.client.ts',
	// Service worker IS the platform fetch layer — caching strategies
	// (CacheFirst, NetworkFirst, StaleWhileRevalidate) require direct
	// fetch() against the original Request object.
	'src/service-worker.ts'
];

function isAllowed(rel) {
	const norm = rel.replaceAll('\\', '/');
	if (ALLOWED_PREFIXES.some((p) => norm.startsWith(p))) return true;
	if (norm.endsWith('+server.ts')) return true;
	if (norm.endsWith('+page.server.ts')) return true;
	if (norm.endsWith('+layout.server.ts')) return true;
	// Feature gateway files (lib/features/<x>/api.ts and nested
	// lib/features/<x>/<sub>/api.ts) ARE the gateway layer per
	// CLAUDE.md rule 6 — they may legitimately use fetch() to hit
	// SvelteKit BFF routes (which the typed $api/client doesn't cover).
	if (/^src\/lib\/features\/[\w-]+(\/[\w-]+)*\/api\.ts$/.test(norm)) return true;
	// Auth session store legitimately calls fetch for logout (BFF endpoint).
	if (norm === 'src/lib/features/auth/stores/session.svelte.ts') return true;
	return false;
}

const files = globSync('src/**/*.{ts,svelte}', {
	cwd: ROOT,
	exclude: ['src/lib/api/generated/**']
});

const violations = [];
for (const rel of files) {
	if (isAllowed(rel)) continue;
	const src = readFileSync(join(ROOT, rel), 'utf8');
	// Match `fetch(` (start of expression — not `event.fetch(` SvelteKit
	// load-fn fetch since that's a wrapper). Whitelist `await fetch` only
	// when used inside the allowed paths (we already filtered those above).
	const matches = [
		...src.matchAll(/(?<![.\w])fetch\s*\(/g),
		...src.matchAll(/globalThis\.fetch\s*\(/g),
		...src.matchAll(/window\.fetch\s*\(/g)
	];
	for (const m of matches) {
		const lineNo = src.slice(0, m.index).split('\n').length;
		// Skip false positives in comments and JSDoc references.
		const lineStart = src.lastIndexOf('\n', m.index) + 1;
		const lineEnd = src.indexOf('\n', m.index);
		const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
		if (/^\s*(\*|\/\/|\/\*)/.test(line)) continue;
		violations.push(`${rel.replaceAll('\\', '/')}:${lineNo}  ${line.trim()}`);
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-no-fetch-in-components: ${files.length} file(s) scanned, no direct fetch outside $api/client + BFF.`
	);
	process.exit(0);
}

console.error(
	`✗ check-no-fetch-in-components: ${violations.length} direct fetch() call(s) outside allowed scope:\n`
);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: route through a feature gateway (src/lib/features/<name>/api.ts) → $api/client. CLAUDE.md rule 6.'
);
process.exit(1);
