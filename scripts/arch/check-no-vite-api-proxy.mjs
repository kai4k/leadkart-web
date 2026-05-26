#!/usr/bin/env node
/**
 * No-Vite-dev-server-proxy gate (regression guard).
 *
 * Vite's `server.proxy` in vite.config.ts SHORT-CIRCUITS SvelteKit's
 * route handler chain in dev mode. If a `/api/*` proxy is configured
 * there, the SvelteKit BFF route at src/routes/api/[...path]/+server.ts
 * NEVER RUNS in dev — browser requests go straight to the Go API
 * without the Bearer header that the BFF reads from the httpOnly
 * access cookie. Every authenticated dev request returns 401.
 *
 * Why this gate exists:
 *   - This bug landed once (2026-05-26) and wasted ~30 min diagnosing
 *     because e2e tests run against `npm run preview` (production
 *     adapter-node) where the Vite proxy never executes. Dev was the
 *     only context where the bug was reachable.
 *   - Canon defense: encode the lesson here so it can't regress.
 *
 * The BFF route is the canonical proxy in BOTH dev and prod. Vite's
 * dev-server proxy belongs in projects that DON'T have a BFF, not here.
 *
 * Exit code: 0 if vite.config.ts has no server.proxy entry, 1 if it does.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const VITE_CONFIG = join(ROOT, 'vite.config.ts');

if (!existsSync(VITE_CONFIG)) {
	console.error('✗ check-no-vite-api-proxy: vite.config.ts missing');
	process.exit(1);
}

const src = readFileSync(VITE_CONFIG, 'utf8');

// Look for `server: { ... proxy: ... }`. The match strips block comments
// and JSDoc so a comment block explaining why proxy is forbidden doesn't
// trigger a false positive.
const sansComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// Regex matches an actual `proxy:` key inside a `server:` block, not
// the word `proxy` appearing in a string or comment.
const SERVER_PROXY = /server\s*:\s*\{[^}]*\bproxy\s*:/;
const API_PATTERN = /['"`]\/api(?:\/[^'"`]*)?['"`]\s*:/;

const violations = [];
if (SERVER_PROXY.test(sansComments)) {
	violations.push('vite.config.ts has a `server.proxy` block');
}
if (API_PATTERN.test(sansComments)) {
	violations.push('vite.config.ts references an `/api/*` route key (likely a proxy target)');
}

if (violations.length === 0) {
	console.log('✓ check-no-vite-api-proxy: vite.config.ts has no /api/* dev-server proxy.');
	process.exit(0);
}

console.error(`✗ check-no-vite-api-proxy: ${violations.length} issue(s):\n`);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: remove the Vite dev-server proxy. The SvelteKit BFF route at\n' +
		'src/routes/api/[...path]/+server.ts is the canonical proxy — it reads\n' +
		'the httpOnly access cookie and injects the Bearer header for the Go\n' +
		'API. A Vite proxy bypasses this, breaking auth in dev only (e2e tests\n' +
		'run against the production build where Vite is absent, so they pass).'
);
process.exit(1);
