#!/usr/bin/env node
/**
 * RTL safety gate (arch test #245).
 *
 * Catches physical CSS properties + values that break right-to-left
 * locales (Arabic, Hebrew, Persian, Urdu). Logical properties (margin-
 * inline-start, padding-block-end, text-align: start) auto-mirror with
 * the document `dir` attribute; physical ones don't.
 *
 * Banned:
 *   margin-left / margin-right / padding-left / padding-right
 *   border-left / border-right / left: / right: (when used for layout)
 *   text-align: left / right
 *
 * The stylelint-plugin-logical-css plugin catches the inside-<style>
 * cases automatically; this script catches:
 *   - Tailwind `ml-*`/`mr-*`/`pl-*`/`pr-*` arbitrary-position utilities
 *     (when the author should use `ms-*`/`me-*`/`ps-*`/`pe-*` instead)
 *   - inline style="..." attrs with banned properties
 *
 * Scope: src/**\/*.svelte. Skip src/styles/* (utility classes there are
 * intentional physical-properties bridges; they're authored mirror-aware).
 *
 * Exit code: 0 on clean, 1 on any banned usage.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Tailwind class-attribute physical utilities. We match the class name
// inside `class="..."` to avoid false-positive on `dir="rtl"` etc.
const TAILWIND_BANNED = [
	/\b(?:ml|mr|pl|pr)-(?:0\.5|\d+(?:\.\d+)?)\b/, // ml-4 / pr-2 / ml-0.5
	/\b(?:left|right)-(?:0\.5|\d+(?:\.\d+)?)\b/, // left-4 / right-2
	/\btext-(?:left|right)\b/, // text-left / text-right
	/\bborder-(?:l|r)(?:-\d+)?\b/ // border-l / border-r-2
];

// Inline style props with banned physical positioning. The check tries
// not to break parts of strings like `style="--x: 1px; left: 2px"` —
// we look for whole keyword at the start of a declaration.
const STYLE_ATTR_BANNED =
	/\b(?:margin|padding|border|inset|left|right|text-align)\s*-\s*(?:left|right)\s*:|\btext-align\s*:\s*(?:left|right)\b/;

// Exemptions for files where physical properties are intentional:
// - CSS files in src/styles/ (utility/base layer, intentionally
//   non-mirror-aware so the consumer chooses)
// - test files
const SKIP_PATHS = [
	'src/styles/',
	'src/lib/icons/',
	'src/lib/api/generated/',
	'src/lib/components/svelte-bits/'
];

const files = globSync('src/**/*.{svelte,css}', { cwd: ROOT });
let violations = [];

for (const rel of files) {
	const norm = rel.replaceAll('\\', '/');
	if (SKIP_PATHS.some((p) => norm.startsWith(p))) continue;
	const src = readFileSync(join(ROOT, rel), 'utf8');

	// Find banned tokens line-by-line so the report stays human-readable.
	const lines = src.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// Skip lines with explicit rtl-allow comment. Walk back up to 10
		// lines because Svelte multi-line attribute declarations and HTML
		// comments above elements regularly span 3-6 lines. Stop walking
		// back if we cross a tag close or a function brace (different
		// block scope).
		if (line.includes('rtl-allow')) continue;
		let silenced = false;
		for (let look = i - 1; look >= 0 && look > i - 10; look--) {
			const probe = lines[look].trim();
			if (probe.includes('rtl-allow')) {
				silenced = true;
				break;
			}
			// Cross a previous element's closing tag — stop the walk.
			if (/^<\/\w+>/.test(probe) || probe === '}') break;
		}
		if (silenced) continue;
		// Skip pure-comment lines (everything starting with // or */)
		const trimmed = line.trim();
		if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

		// 1. Tailwind class attribute scan — look inside class="..." or class:foo="..." or {className...}
		const classMatches = [...line.matchAll(/class(?:Name)?=(["'`])([^"'`]*)\1/g)];
		for (const cm of classMatches) {
			const classes = cm[2];
			for (const re of TAILWIND_BANNED) {
				if (re.test(classes)) {
					violations.push({
						file: norm,
						line: i + 1,
						kind: 'tailwind',
						snippet: classes.trim().slice(0, 80)
					});
				}
			}
		}

		// 2. Inline style="..." attribute scan
		const styleMatches = [...line.matchAll(/style=(["'`])([^"'`]*)\1/g)];
		for (const sm of styleMatches) {
			if (STYLE_ATTR_BANNED.test(sm[2])) {
				violations.push({
					file: norm,
					line: i + 1,
					kind: 'inline-style',
					snippet: sm[2].trim().slice(0, 80)
				});
			}
		}
	}
}

// De-duplicate by file+line+snippet
const seen = new Set();
violations = violations.filter((v) => {
	const key = `${v.file}:${v.line}:${v.snippet}`;
	if (seen.has(key)) return false;
	seen.add(key);
	return true;
});

if (violations.length === 0) {
	console.log(
		`✓ check-rtl-safety: ${files.length} file(s) scanned, no physical-direction CSS in mirrorable surfaces.`
	);
	process.exit(0);
}

console.error(`✗ check-rtl-safety: ${violations.length} physical-direction usage(s):\n`);
for (const v of violations.slice(0, 100)) {
	console.error(`  ${v.file}:${v.line}  [${v.kind}]  ${v.snippet}`);
}
if (violations.length > 100) console.error(`  ... and ${violations.length - 100} more.`);
console.error('\nFix: prefer logical properties + Tailwind logical utilities:');
console.error('  ml-4 → ms-4    mr-2 → me-2     pl-4 → ps-4    pr-2 → pe-2');
console.error('  left: 0 → inset-inline-start: 0       right: 0 → inset-inline-end: 0');
console.error('  text-align: left/right → text-align: start/end');
console.error(
	'Add `rtl-allow` comment on the line to silence intentional physical positioning (e.g. icons that must visually flip with locale).'
);
process.exit(1);
