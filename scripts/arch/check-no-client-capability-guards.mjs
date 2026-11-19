#!/usr/bin/env node
/**
 * No-client-capability-guard gate (Phase 1b, BFF hardening).
 *
 * A component must not redirect on a capability check: by the time client
 * code runs (`$effect`, `$effect.pre`, `$derived` + effect, `onMount`, …) the
 * server has already rendered the page and fired its queries. Capability
 * guards belong in +page.server.ts / +layout.server.ts via guardPage() /
 * requireCapability() from #lib/server/guards.ts.
 *
 * File-level rule (no attempt to parse which block does what): a route
 * component (src/routes/**\/*.svelte) or feature component
 * (src/lib/features/**\/*.svelte) that both calls `goto(` and references
 * `session.can` / `myCapabilitiesQuery` / `capabilities` fails, unless it is
 * in ALLOWLIST below. Comments are ignored.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Files that legitimately do both. Each entry: why its `goto` is not a guard.
 * Adding a file here needs the same justification.
 */
const ALLOWLIST = [
	// goto syncs the URL filters / opens a lead row; capabilities only hide action buttons.
	'src/routes/(app)/leads/+page.svelte',
	// goto opens a tenant from a membership row; capabilities only hide manage/anonymise actions.
	'src/lib/features/operator/people/components/PersonDetail.svelte',
	// goto syncs the URL filters; capabilities only hide create/view/manage actions.
	'src/lib/features/operator/tenants/components/TenantsList.svelte',
	// goto leaves the scope after "Exit context"; capabilities only choose which tabs are listed.
	'src/routes/(app)/operator/scope/+layout.svelte',
	// goto opens a tenant scope / person picked from a search hit; capabilities only choose the groups listed.
	'src/lib/features/search/components/CommandPalette.svelte'
];

const CAPABILITY =
	/\bhasCapability\b|\bmyCapabilitiesQuery\b|\bcapabilities\b|\bsession\.can(Any)?\b/;
const GOTO = /\bgoto\s*\(/;

/** Drop HTML, block and line comments so prose never trips the rule. */
function stripComments(src) {
	return src
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const files = globSync(['src/routes/**/*.svelte', 'src/lib/features/**/*.svelte'], { cwd: ROOT })
	.map((f) => f.replaceAll('\\', '/'))
	.filter((f) => !f.endsWith('.stories.svelte'));

const violations = [];
for (const rel of files) {
	if (ALLOWLIST.includes(rel)) continue;
	const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
	if (GOTO.test(src) && CAPABILITY.test(src)) violations.push(rel);
}

const stale = ALLOWLIST.filter((f) => !files.includes(f));

if (violations.length === 0 && stale.length === 0) {
	console.log(
		`✓ check-no-client-capability-guards: ${files.length} component(s), no client-side capability redirects (${ALLOWLIST.length} allowlisted).`
	);
	process.exit(0);
}

if (violations.length > 0) {
	console.error(
		`✗ check-no-client-capability-guards: ${violations.length} file(s) both navigate and read capabilities:\n`
	);
	for (const v of violations) console.error(`  ${v}`);
	console.error(
		'\nFix: move the check to +page.server.ts / +layout.server.ts with guardPage() / requireCapability() (#lib/server/guards.ts).' +
			'\nIf the goto is not a guard, add the file to ALLOWLIST with a comment saying why.'
	);
}
if (stale.length > 0) {
	console.error(`✗ check-no-client-capability-guards: allowlisted file(s) no longer exist:\n`);
	for (const s of stale) console.error(`  ${s}`);
}
process.exit(1);
