#!/usr/bin/env node
/**
 * No-client-capability-guard gate (Phase 1b, BFF hardening).
 *
 * A route component must not redirect on a capability check inside
 * $effect: the server has already rendered the page and fired its queries
 * by then. Capability guards belong in +page.server.ts / +layout.server.ts
 * via requireCapability() from #lib/server/guards.ts.
 *
 * Exit code: 0 on clean, 1 on any violation.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const files = globSync('src/routes/**/*.svelte', { cwd: ROOT });

const violations = [];
for (const rel of files) {
	const src = readFileSync(join(ROOT, rel), 'utf8');
	const effects = src.match(/\$effect\(\s*\(\)\s*=>\s*\{[\s\S]*?\r?\n\t\}\);/g) ?? [];
	if (effects.some((e) => /hasCapability|capabilities/.test(e) && /goto\(/.test(e))) {
		violations.push(rel.replaceAll('\\', '/'));
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-no-client-capability-guards: ${files.length} route component(s), no client-side capability redirects.`
	);
	process.exit(0);
}

console.error(
	`✗ check-no-client-capability-guards: ${violations.length} file(s) guard on the client:\n`
);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: move the check to +page.server.ts / +layout.server.ts with requireCapability() (#lib/server/guards.ts).'
);
process.exit(1);
