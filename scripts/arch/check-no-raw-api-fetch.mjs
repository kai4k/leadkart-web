#!/usr/bin/env node
/**
 * No-raw-API-fetch gate (fix round 9).
 *
 * Every browser call to `/api` goes through the ONE client (`src/lib/api/client.ts`): it adds the
 * CSRF token and the tenant-context fingerprint the BFF now requires on every call, maps errors and
 * follows session renewal. A hand-rolled `fetch('/api/...')` elsewhere silently loses the
 * fingerprint and is answered 409 `scope_changed` by the BFF for every user (three gateways did).
 *
 * Rule, per file under src/: a file that has a `fetch(` call (also `window.fetch` /
 * `globalThis.fetch`) AND a string literal that starts with `/api` is a violation, unless it is one
 * of the sites that legitimately speak to Go or are the BFF itself:
 *   - src/lib/api/client.ts      the client
 *   - src/routes/api/**          the BFF's own handlers
 *   - src/lib/server/**          server code (its `fetch` goes to the Go API)
 *   - src/service-worker/index.ts  names `/api` only to not intercept it (see ALLOWED)
 * There are no other pinned exceptions. Comments never count.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Files allowed to have both: exact paths and directory prefixes. The pinned exception is the
 * service worker: it names `/api` only to NOT intercept it (its test pins that), and its own
 * `fetch(req)` calls forward requests the browser made.
 */
const ALLOWED = [
	'src/lib/api/client.ts',
	'src/routes/api/',
	'src/lib/server/',
	'src/service-worker/index.ts'
];

const FETCH_CALL =
	/(?<![.\w])(?:(?:window|globalThis)\.)?fetch\s*\(|\b(?:window|globalThis)\.fetch\s*\(/;
const API_LITERAL = /(['"`])\/api(?:[/?'"`]|\$\{)/;

/** Drop block, line and HTML comments so prose never trips the rule (line breaks are kept). */
export function stripComments(src) {
	const blank = (m) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** The 1-based line numbers of `fetch(` calls in a source that also names an `/api` path; empty when clean. */
export function findRawApiFetches(src) {
	const code = stripComments(src);
	if (!API_LITERAL.test(code)) return [];
	const out = [];
	code.split('\n').forEach((line, i) => {
		if (FETCH_CALL.test(line)) out.push(i + 1);
	});
	return out;
}

export function isAllowed(rel) {
	const norm = rel.replaceAll('\\', '/');
	return ALLOWED.some((a) => (a.endsWith('/') ? norm.startsWith(a) : norm === a));
}

function main() {
	const files = globSync('src/**/*.{ts,svelte}', {
		cwd: ROOT,
		exclude: ['src/lib/api/generated/**']
	}).map((f) => f.replaceAll('\\', '/'));
	const violations = [];
	for (const rel of files) {
		if (isAllowed(rel)) continue;
		for (const line of findRawApiFetches(readFileSync(join(ROOT, rel), 'utf8'))) {
			violations.push(`${rel}:${line}`);
		}
	}
	if (violations.length === 0) {
		console.log(
			`✓ check-no-raw-api-fetch: ${files.length} file(s), no hand-rolled fetch to /api outside the API client.`
		);
		process.exit(0);
	}
	console.error(
		`✗ check-no-raw-api-fetch: ${violations.length} \`fetch(\` call(s) in files that name an /api path:\n`
	);
	for (const v of violations) console.error(`  ${v}`);
	console.error(
		'\nFix: go through `api.get / post / postJson / postForm / getBlob` in src/lib/api/client.ts: it adds the CSRF token and the context fingerprint the BFF requires.'
	);
	process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
