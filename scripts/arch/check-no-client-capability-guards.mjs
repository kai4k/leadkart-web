#!/usr/bin/env node
/**
 * No-client-capability-guard gate (Phase 1b, BFF hardening).
 *
 * A component must not redirect on a capability check: by the time client code runs (`$effect`,
 * `$effect.pre`, `$derived` + effect, `onMount`, ...) the server has already rendered the page and
 * fired its queries. Capability guards belong in +layout.server.ts via guardAppRoute (the nav
 * config decides) and, for form actions, authoriseAction() from #lib/server/form-action.ts.
 *
 * Rule, per file: a client source (src/routes, src/lib/features and src/lib/layouts, `.svelte` and
 * `.svelte.ts`) that reads a capability AND calls `goto(` fails, unless EACH `goto(` call is marked
 * on its own line (or the line above) with
 *
 *     // not-a-guard: <why this navigation does not depend on a capability>
 *
 * A per-call marker, not a per-file allowlist, so a guard added later to a file that already has a
 * justified `goto` is still caught. A capability read is `session.can` / `session.canAny`,
 * `hasCapability`, `capabilities`, or `can` / `canAny` imported from the auth feature under ANY
 * local name (`import { can as mayDo }`). Comments never count as code; the marker is read from
 * the raw text.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const MARKER = /not-a-guard:\s*\S/;
const BASE_CAPABILITY = /\bhasCapability\b|\bcapabilities\b|\bsession\.can(Any)?\b/;
const GOTO = /\bgoto\s*\(/;

/** Drop HTML, block and line comments so prose never trips the rule (line breaks are kept). */
export function stripComments(src) {
	const blank = (m) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Local names `can` / `canAny` are imported under (the plain names and any `as` alias). */
function importedCapabilityNames(code) {
	const names = new Set();
	for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*['"]/g)) {
		for (const part of m[1].split(',')) {
			const [imported, local] = part
				.trim()
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)
				.map((s) => s.trim());
			if (imported === 'can' || imported === 'canAny') names.add(local ?? imported);
		}
	}
	return names;
}

/**
 * The line numbers (1-based) of unmarked `goto(` calls in a source that also reads a capability;
 * empty when there is nothing wrong.
 */
export function findViolations(src) {
	const code = stripComments(src);
	const aliases = [...importedCapabilityNames(code)];
	const aliasRule = aliases.length
		? new RegExp(`\\b(?:${aliases.map((a) => a.replace(/\W/g, '')).join('|')})\\s*\\(`)
		: null;
	if (!BASE_CAPABILITY.test(code) && !(aliasRule && aliasRule.test(code))) return [];
	const raw = src.split('\n');
	const lines = code.split('\n');
	const out = [];
	lines.forEach((line, i) => {
		if (!GOTO.test(line)) return;
		// The line above only counts when it is a comment line of its own: a marker on a neighbouring
		// CODE line never covers this call.
		const above = (raw[i - 1] ?? '').trim();
		const aboveIsComment = /^(\/\/|\/\*|<!--)/.test(above);
		const marked = MARKER.test(raw[i] ?? '') || (aboveIsComment && MARKER.test(above));
		if (!marked) out.push(i + 1);
	});
	return out;
}

const SCAN = [
	'src/routes/**/*.svelte',
	'src/routes/**/*.svelte.ts',
	'src/lib/features/**/*.svelte',
	'src/lib/features/**/*.svelte.ts',
	'src/lib/layouts/**/*.svelte',
	'src/lib/layouts/**/*.svelte.ts'
];

function main() {
	const files = globSync(SCAN, { cwd: ROOT })
		.map((f) => f.replaceAll('\\', '/'))
		.filter((f) => !f.endsWith('.stories.svelte'));

	const violations = [];
	for (const rel of files) {
		const lines = findViolations(readFileSync(join(ROOT, rel), 'utf8'));
		for (const line of lines) violations.push(`${rel}:${line}`);
	}

	if (violations.length === 0) {
		console.log(
			`✓ check-no-client-capability-guards: ${files.length} client file(s), no unmarked navigation in a file that reads capabilities.`
		);
		process.exit(0);
	}
	console.error(
		`✗ check-no-client-capability-guards: ${violations.length} \`goto(\` call(s) in files that also read capabilities:\n`
	);
	for (const v of violations) console.error(`  ${v}`);
	console.error(
		'\nFix: move the check to a +layout.server.ts guard (guardAppRoute, #lib/server/guards.ts; the nav config decides) or, for an action, authoriseAction() (#lib/server/form-action.ts).' +
			'\nIf the navigation is not a guard, mark that call: `// not-a-guard: <why>` on its line or the line above.'
	);
	process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
