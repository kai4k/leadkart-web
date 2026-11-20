import type { KnipConfig } from 'knip';

/**
 * Knip — dead-code + dead-export gate (arch tests #98-101).
 *
 * Runs `knip --no-progress` and fails CI on any unused file, unused
 * export, unused dependency, or unused type. Entry points listed below
 * are the legitimate ones SvelteKit invokes; everything reached
 * transitively from them must be referenced.
 *
 * Tuning notes:
 *   - SvelteKit's filesystem routing means `+page.svelte`, `+layout.ts`,
 *     `+server.ts`, etc. are implicit entries.
 *   - Storybook + Chromatic are not wired yet — once they are, add their
 *     story files as entries.
 */
const config: KnipConfig = {
	entry: [
		// SvelteKit filesystem-routed entries
		'src/routes/**/+{page,layout,error,server}.{ts,svelte}',
		'src/routes/**/+{page,layout}.server.ts',
		'src/hooks.{client,server}.ts',
		'src/app.{d.ts,html}',
		// Kit 3 env schema + service worker (framework-loaded by convention)
		'src/env.ts',
		'src/service-worker/index.ts',
		// Architecture script runner + custom checks
		'scripts/**/*.{ts,js,mjs,cjs}',
		// Tests
		'tests/e2e/**/*.spec.ts',
		'tests/unit/**/*.test.ts',
		// Feature + component barrels — public API surface; their exports
		// count as "used" even when no in-repo consumer references them
		// (consumers may live in future feature work or external bundlers).
		'src/lib/features/*/index.ts!',
		'src/lib/features/*/*/index.ts!',
		'src/lib/components/*/index.ts!',
		'src/lib/components/**/index.ts!',
		'src/lib/icons/index.ts!',
		'src/lib/hooks/index.ts!',
		'src/lib/api/errors.ts!',
		'src/lib/api/client.ts!',
		// Storybook stories — entries consumed by Storybook's filesystem
		// loader (.storybook/main.ts globs them). knip can't see that wire.
		'src/lib/**/*.stories.@(ts|svelte)!'
	],
	project: ['src/**/*.{ts,svelte,svelte.ts}', 'scripts/**/*.{ts,js,mjs,cjs}'],
	ignore: [
		'src/lib/api/generated/**',
		// Empty by design: check-feature-structure requires an api.ts in every feature folder.
		'src/lib/features/preferences/api.ts'
	],
	// Kit 3 virtual modules ($app/*) have no file on disk. ($service-worker is removed in Kit 3 and banned by eslint.)
	ignoreUnresolved: [/^\$app\//],
	ignoreDependencies: [
		// Fontsource referenced via @import in tokens.css
		'@fontsource-variable/jetbrains-mono',
		// Tailwind 4 — consumed via `@import 'tailwindcss'` in app.css
		'tailwindcss',
		// postcss — peer of stylelint declaration-strict-value plugin, resolved by stylelint itself
		'postcss',
		// OpenAPI generators — spawned via npx from scripts/openapi-codegen.mjs
		'openapi-typescript',
		'openapi-zod-client'
	]
};

export default config;
