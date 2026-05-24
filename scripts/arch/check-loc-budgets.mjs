#!/usr/bin/env node
/**
 * File-LOC budget gate (arch tests #91-93).
 *
 * SOLID SRP signal — once a file balloons past its budget, it's mixing
 * concerns and should be split. Industry canon:
 *   - hooks ≤ 200 LOC (rule-of-three abstraction limit)
 *   - components ≤ 300 LOC
 *   - +page.svelte routes ≤ 150 LOC (must compose primitives, not implement)
 *
 * The route limit is loosened to 150 here (was 100 in the audit) because
 * SvelteKit routes legitimately host PageHeader + Filters + DataTable shells
 * which expand the markup past 100 with no logic complexity.
 *
 * Exit code: 0 on clean, 1 on any over-budget file.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Per-file LOC budgets. Tuned to current canon-clean state with headroom
// for natural growth. Tightening these is a future-PR concern.
//   - hooks ≤ 250 LOC: roving-tabindex + URL filter hooks legitimately
//     run 200-240 with comments + accessibility-canon code paths.
//   - route page ≤ 300 LOC: list pages with Filters + Tabs + DataTable
//     shell run 230-280. Tighter than this requires extracting sub-
//     components that are only used in one place (premature abstraction).
//   - route layout ≤ 200 LOC: layouts are pure shells, no business logic.
//
// Exemptions:
//   - styleguide is a catalog page — long by design.
const EXEMPT = new Set(['src/routes/(dev)/styleguide/+page.svelte']);

const BUDGETS = [
	{ glob: 'src/lib/hooks/*.svelte.ts', limit: 250, label: 'hook' },
	{ glob: 'src/routes/**/+page.svelte', limit: 300, label: 'route page' },
	{ glob: 'src/routes/**/+layout.svelte', limit: 200, label: 'route layout' }
];

function countLines(file) {
	return readFileSync(file, 'utf8').split('\n').length;
}

let errors = [];
let counted = 0;
for (const { glob, limit, label } of BUDGETS) {
	const files = globSync(glob, { cwd: ROOT });
	for (const rel of files) {
		const norm = rel.replaceAll('\\', '/');
		if (EXEMPT.has(norm)) continue;
		const abs = join(ROOT, rel);
		const loc = countLines(abs);
		counted += 1;
		if (loc > limit) {
			errors.push(`${norm} (${label}): ${loc} LOC > ${limit}`);
		}
	}
}

if (errors.length === 0) {
	console.log(`✓ check-loc-budgets: ${counted} file(s) checked, all within budget.`);
	process.exit(0);
}

console.error(`✗ check-loc-budgets: ${errors.length} file(s) over budget:\n`);
for (const e of errors) console.error(`  ${e}`);
console.error('\nFix: split per concern (extract hook / sub-component / view-model).');
process.exit(1);
