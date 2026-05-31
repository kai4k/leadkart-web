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
		'src/lib/**/*.stories.@(ts|svelte)!',
		'.storybook/main.ts!',
		'.storybook/preview.ts!'
	],
	project: ['src/**/*.{ts,svelte,svelte.ts}', 'scripts/**/*.{ts,js,mjs,cjs}'],
	ignore: [
		'src/lib/api/generated/**',
		'src/app.d.ts',
		'tests/e2e/mock-server/**',
		'tests/unit/stubs/**'
	],
	ignoreDependencies: [
		// Vite/Tailwind plugin chain is referenced via config files
		'@tailwindcss/vite',
		'@sveltejs/vite-plugin-svelte',
		'@sveltejs/adapter-auto',
		'prettier-plugin-svelte',
		'prettier-plugin-tailwindcss',
		'eslint-config-prettier',
		'eslint-plugin-svelte',
		'@eslint/compat',
		'@eslint/js',
		'globals',
		'typescript-eslint',
		// Husky's prepare hook + lint-staged are runtime-only deps
		'husky',
		// Size-limit preset referenced via top-level config block
		'@size-limit/preset-app',
		// JS adapter dep referenced indirectly via build
		'@sveltejs/adapter-node',
		// Fontsource referenced via @import in tokens.css
		'@fontsource-variable/jetbrains-mono',
		// postcss-html consumed by stylelint customSyntax declaration
		'postcss-html',
		// Stylelint plugin loaded by plugin name in .stylelintrc.cjs
		'stylelint-plugin-logical-css',
		// Storybook 10 framework + addons (auto-discovered by storybook CLI)
		'storybook',
		'@storybook/svelte',
		'@storybook/sveltekit',
		'@storybook/addon-essentials',
		// oxlint — invoked by name via npm scripts + npx, knip doesn't see the call site
		'oxlint',
		// Tailwind 4 — consumed via @tailwindcss/vite plugin + `@import 'tailwindcss'` in app.css
		'tailwindcss',
		// tw-animate-css — consumed via `@import 'tw-animate-css'` in app.css
		'tw-animate-css',
		// postcss — peer of stylelint declaration-strict-value plugin, resolved by stylelint itself
		'postcss'
	]
};

export default config;
