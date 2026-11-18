#!/usr/bin/env node
/**
 * Query-client-per-request gate (SSR isolation).
 *
 * The Node server renders every user's pages. A QueryClient shared across
 * requests leaks one user's cached data into another user's HTML, so:
 *
 *   1. `new QueryClient(` appears only in src/lib/api/query-client.ts (the
 *      `createQueryClient` factory: one place for the defaults).
 *   2. Every file that mounts `<QueryClientProvider` obtains its client from
 *      `renderQueryClient()` (browser: the tab's client; server: one per request).
 *   3. Nothing outside query-client.ts names the browser singleton.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const FACTORY = 'src/lib/api/query-client.ts';

const files = globSync('src/**/*.{ts,svelte}', { cwd: ROOT })
	.map((f) => f.replaceAll('\\', '/'))
	.filter((f) => f !== FACTORY && !/\.(test|spec|stories)\./.test(f));

const violations = [];
for (const rel of files) {
	const src = readFileSync(join(ROOT, rel), 'utf8');
	if (/new\s+QueryClient\s*\(/.test(src)) {
		violations.push(
			`${rel}: constructs a QueryClient — use createQueryClient() via renderQueryClient()`
		);
	}
	// Markup only (`<QueryClientProvider client=…>` / `{client}`), not prose in comments.
	if (
		/<QueryClientProvider\s[^>]*\bclient\b/.test(src) &&
		!/\brenderQueryClient\s*\(\s*\)/.test(src)
	) {
		violations.push(`${rel}: <QueryClientProvider> without renderQueryClient()`);
	}
	if (/\bbrowserClient\b/.test(src)) {
		violations.push(`${rel}: names the browser query-client singleton`);
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-query-client-per-request: ${files.length} file(s), QueryClient only from ${FACTORY}.`
	);
	process.exit(0);
}

console.error(`✗ check-query-client-per-request: ${violations.length} violation(s):\n`);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: mount <QueryClientProvider client={renderQueryClient()}> and read the client with useQueryClient().'
);
process.exit(1);
