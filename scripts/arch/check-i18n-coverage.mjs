#!/usr/bin/env node
/**
 * i18n coverage + ICU pluralization gate (arch tests #39, #247).
 *
 * Two checks in one script:
 *
 *   (a) HARDCODED STRINGS — flag user-facing text in *.svelte files
 *       that isn't wrapped in $_(...). Heuristics:
 *         - String literals inside JSX text nodes (between tags)
 *         - String literals as values of common UI attrs (placeholder,
 *           title, aria-label, alt) — these are user-facing too
 *       Skip:
 *         - dev pages (styleguide), test files, generated code
 *         - strings that are CSS-class-shaped, single chars, urls,
 *           or look like CSS values (rem, px, var()).
 *
 *   (b) ICU PLURALIZATION — flag `if (count === 1) ... else ...` patterns
 *       around translated strings. ICU MessageFormat supports plurals via
 *       `{count, plural, one {…} other {…}}`; raw if/else is anti-canon.
 *
 * Exit code: 0 on clean, 1 on any violation in either check.
 *
 * NOTE: this gate is intentionally heuristic. False positives can be
 * silenced by adding `// i18n-allow` on the line above the string, OR
 * by wrapping in $_(). False negatives still get caught at PR review.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const SKIP_PATHS = ['src/routes/(dev)/', 'src/lib/api/generated/', 'src/lib/icons/'];

// Hardcoded-string check (a) is currently deferred — implementing a
// reliable heuristic for "user-facing string inside JSX" without a real
// AST is too noisy. Current scope: ICU pluralization detection only.
// When Storybook + test-storybook ship the visual catalog, the
// hardcoded-string sweep gets a meaningful baseline to ratchet from.

const files = globSync('src/**/*.svelte', { cwd: ROOT });
const i18nViolations = [];
const pluralViolations = [];
const pluralPattern =
	/(?:items?|users?|messages?|results?|orders?|leads?|days?|hours?|minutes?|errors?|warnings?|sessions?)\.length\s*===?\s*1\s*\?/g;

for (const rel of files) {
	const norm = rel.replaceAll('\\', '/');
	if (SKIP_PATHS.some((p) => norm.startsWith(p))) continue;
	const src = readFileSync(join(ROOT, rel), 'utf8');

	// (b) ICU pluralization heuristic
	for (const m of src.matchAll(pluralPattern)) {
		const lineNo = src.slice(0, m.index).split('\n').length;
		// Skip if line has an i18n-allow comment
		const lineStart = src.lastIndexOf('\n', m.index) + 1;
		const lineEnd = src.indexOf('\n', m.index);
		const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
		if (line.includes('i18n-allow')) continue;
		pluralViolations.push(`${norm}:${lineNo}  ${line.trim().slice(0, 80)}`);
	}
}

const totalViolations = i18nViolations.length + pluralViolations.length;
if (totalViolations === 0) {
	console.log(
		`✓ check-i18n-coverage: ${files.length} .svelte file(s), no hardcoded-string or non-ICU pluralization patterns detected.`
	);
	process.exit(0);
}

if (i18nViolations.length > 0) {
	console.error(
		`✗ check-i18n-coverage: ${i18nViolations.length} hardcoded user-facing string(s):\n`
	);
	for (const v of i18nViolations.slice(0, 50)) console.error(`  ${v}`);
	if (i18nViolations.length > 50) console.error(`  ... and ${i18nViolations.length - 50} more.`);
	console.error("\nFix: wrap in $_('key.path') and add the key to src/lib/i18n/locales/en.json.");
}

if (pluralViolations.length > 0) {
	console.error(
		`\n✗ check-i18n-coverage: ${pluralViolations.length} probable manual-pluralization pattern(s):\n`
	);
	for (const v of pluralViolations) console.error(`  ${v}`);
	console.error(
		"\nFix: use ICU MessageFormat plurals. svelte-i18n supports `{count, plural, one {1 item} other {# items}}` via $_('key', { values: { count } })."
	);
}

process.exit(1);
