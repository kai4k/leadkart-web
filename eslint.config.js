import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

/**
 * Architecture-canon ESLint config — strict gates, no warnings.
 *
 * Every rule below is intentional and ties back to CLAUDE.md or the
 * architecture-tests document. Disabling any rule requires a PR comment
 * justifying it (the canon rolls the gate forward, not backward).
 *
 * Layered config order (typescript-eslint flat-config best practice):
 *   1. ignores (must come first per typescript-eslint docs)
 *   2. recommended baselines (js, ts, svelte)
 *   3. prettier disables (must come AFTER recommended to win)
 *   4. global rules (language-agnostic)
 *   5. language-specific overrides (.ts vs .svelte vs tests vs configs)
 *   6. file-scoped boundaries (lucide registry, BFF-only fetch, etc.)
 */
export default ts.config(
	includeIgnoreFile(gitignorePath),
	{
		ignores: [
			'src/lib/api/generated/**',
			'.svelte-kit/**',
			'build/**',
			'coverage/**',
			'playwright-report/**',
			'test-results/**',
			'storybook-static/**',
			// Storybook stories — Storybook 10 + Svelte 5 typing isn't
			// fully ergonomic yet for inline string children. Stories
			// type-check inside Storybook's own pipeline (storybook build).
			'**/*.stories.ts',
			'**/*.stories.svelte',
			'.storybook/**'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		files: ['**/*.{ts,svelte,svelte.ts}'],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			'no-undef': 'off',

			// ─── Console / debugging discipline ─────────────────────
			// Rule 61: only `warn` + `error` permitted in production code;
			// `log` / `debug` / `info` are dev-only and route through
			// `$lib/utils/logger.ts` (when added).
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'no-alert': 'error',

			// ─── Code-quality canon ─────────────────────────────────
			'no-throw-literal': 'error',
			'no-return-await': 'error',
			'no-implicit-coercion': 'error',
			'no-param-reassign': ['error', { props: false }],
			'no-restricted-globals': [
				'error',
				{
					name: 'process',
					message:
						'Use $env/static/public or $env/dynamic/public — process.env reads break SSR + tree-shaking.'
				}
			],

			// ─── Security ───────────────────────────────────────────
			// Rule 60: no eval / new Function / implied-eval (string setTimeout).
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-new-func': 'error',
			'no-script-url': 'error',

			// ─── Async hygiene ──────────────────────────────────────
			'require-await': 'off', // ts-eslint variant takes over
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',

			// ─── TypeScript strictness ──────────────────────────────
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{ prefer: 'type-imports', fixStyle: 'separate-type-imports' }
			],
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/prefer-as-const': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			// array-type — relaxed to allow both `T[]` and `ReadonlyArray<T>`.
			// Style preference, not architectural; both are canonical and used
			// across the codebase. Reinstate as 'array-simple' if churn becomes
			// a problem (Linear convention).
			'@typescript-eslint/array-type': 'off',
			'@typescript-eslint/no-empty-object-type': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_'
				}
			],

			// ─── Banned legacy patterns ─────────────────────────────
			// Rule 67: only @ts-expect-error with description; @ts-ignore banned.
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-expect-error': 'allow-with-description',
					'ts-ignore': true,
					'ts-nocheck': true,
					'ts-check': false,
					minimumDescriptionLength: 10
				}
			],

			// ─── Restricted syntax (CLAUDE.md anti-patterns) ────────
			'no-restricted-syntax': [
				'error',
				{
					selector: "MemberExpression[object.name='process'][property.name='env']",
					message:
						'process.env is forbidden — use $env/static/public / $env/dynamic/public per SvelteKit canon.'
				},
				{
					// Rule 35: `instanceof Error` is too broad — use ApiError subclass.
					// Subclass-discriminated handlers stay specific; bare-Error catches
					// hide unknown failure modes behind a single branch.
					selector: "BinaryExpression[operator='instanceof'][right.name='Error']",
					message:
						'instanceof Error is too broad — match on ApiError subclasses (ValidationError, ConflictError, AuthError, NetworkError, NotFoundError, ServerError) instead.'
				},
				{
					// Rule 36: gateways must throw typed subclass, not raw new Error.
					selector: "ThrowStatement > NewExpression[callee.name='Error']",
					message:
						"Don't throw new Error directly — throw a typed ApiError subclass so callers can pattern-match on err.code / err.fields / err.status."
				}
			],

			// ─── Import boundaries (cross-feature, etc.) ────────────
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '$app/stores',
							message:
								'$app/stores is deprecated since SvelteKit 2.59+ — use $app/state (page/navigating/updated) instead. CLAUDE.md banned-list.'
						},
						{
							name: 'svelte/store',
							importNames: ['writable', 'readable', 'derived'],
							message:
								'writable/readable/derived from svelte/store are forbidden in new code — use class-based $state stores per CLAUDE.md rule 4.'
						},
						{
							name: 'svelte',
							importNames: ['createEventDispatcher'],
							message:
								'createEventDispatcher is forbidden — use callback props (Svelte 5 native event-as-callback pattern).'
						},
						{
							name: 'remixicon',
							message: 'Only lucide-svelte (via $icons) is permitted — CLAUDE.md rule 5.'
						},
						{
							name: 'boxicons',
							message: 'Only lucide-svelte (via $icons) is permitted — CLAUDE.md rule 5.'
						},
						{
							name: 'line-awesome',
							message: 'Only lucide-svelte (via $icons) is permitted — CLAUDE.md rule 5.'
						},
						{
							name: 'react-icons',
							message: 'Only lucide-svelte (via $icons) is permitted — CLAUDE.md rule 5.'
						},
						{
							name: '@iconify/svelte',
							message: 'Only lucide-svelte (via $icons) is permitted — CLAUDE.md rule 5.'
						},
						{
							name: 'moment',
							message:
								'moment is forbidden (large + immutable-API smell) — use @internationalized/date or native Intl.'
						},
						{
							name: 'lodash',
							message:
								'Import from lodash-es subpaths only (lodash-es/foo) for tree-shaking — full barrel banned.'
						}
					],
					patterns: [
						{
							group: ['$features/*/*/*'],
							message:
								'Deep imports into feature internals are forbidden — import from the feature barrel ($features/<name>) only.'
						}
					]
				}
			],

			// ─── Object shorthand + cleanliness ─────────────────────
			'object-shorthand': ['error', 'always'],
			'prefer-const': 'error',
			'prefer-template': 'error',
			'no-useless-rename': 'error',
			'no-useless-concat': 'error',
			eqeqeq: ['error', 'always', { null: 'ignore' }]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			// ─── Svelte 5 runes purity (CLAUDE.md rule 4) ──────────
			'svelte/no-at-html-tags': 'error',
			'svelte/no-target-blank': ['error', { allowReferrer: false }],
			'svelte/no-reactive-reassign': 'error',
			'svelte/button-has-type': 'error',
			'svelte/require-each-key': 'error',
			'svelte/no-useless-mustaches': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			// Bidirectional safety + a11y
			'svelte/no-dom-manipulating': 'error',
			'svelte/no-dupe-on-directives': 'error',
			'svelte/no-dupe-style-properties': 'error',
			'svelte/no-dynamic-slot-name': 'error',
			'svelte/no-not-function-handler': 'error',
			'svelte/no-object-in-text-mustaches': 'error',
			'svelte/no-shorthand-style-property-overrides': 'error',
			'svelte/no-spaces-around-equal-signs-in-attribute': 'error',
			'svelte/no-unknown-style-directive-property': 'error',
			'svelte/no-unused-svelte-ignore': 'error',
			'svelte/require-store-callbacks-use-set-param': 'error',
			'svelte/valid-each-key': 'error',

			// ─── Svelte-5 runes idioms: opt out of mainstream rules
			//     that fight the canonical syntax. ──────────────────
			// `let { foo } = $props()` is the canon destructure for
			// Svelte 5 props — the `let` is structural (runes track
			// reactivity via let bindings), not a "let-vs-const" choice.
			'prefer-const': 'off',
			// Event handlers in Svelte are fire-and-forget callbacks.
			// `<button onclick={async () => …}>` is canonical; awaiting
			// the promise would suspend the synchronous event loop.
			// no-floating-promises / no-misused-promises produce false
			// positives across every onclick / onsubmit / oninput.
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			// require-await fires on `async function load({ fetch })` in
			// +server / +layout.server / +page.server files where
			// SvelteKit's contract requires the async signature even when
			// the body happens to be synchronous (re-throws, return-data).
			'@typescript-eslint/require-await': 'off',
			// import() type annotations come up in generics= attrs:
			// `<script lang="ts" generics="T extends import('$lib/hooks').Foo">`.
			// Canonical Svelte 5 syntax; the rule's "import type" fix
			// doesn't apply to inline generics.
			'@typescript-eslint/consistent-type-imports': 'off'
		}
	},
	// ─── Tests + e2e ────────────────────────────────────────────
	{
		files: [
			'tests/**/*.{ts,js}',
			'**/*.test.{ts,js}',
			'**/*.spec.{ts,js}',
			'tests/e2e/**/*.{ts,js}',
			'tests/unit/**/*.{ts,js}'
		],
		rules: {
			// Test scaffolding can use raw new Error / instanceof Error /
			// console.log without architectural significance.
			'no-console': 'off',
			'no-restricted-syntax': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-floating-promises': 'off'
		}
	},
	// ─── Config files (vite, vitest, playwright, svelte, eslint) ──
	{
		files: [
			'*.config.{ts,js,mjs,cjs}',
			'.*.{cjs,mjs,js}',
			'.dependency-cruiser.cjs',
			'.stylelintrc.cjs',
			'scripts/**/*.{ts,js,mjs,cjs}',
			'.lintstagedrc.*',
			'svelte.config.js',
			'playwright.config.*',
			'vitest.config.*',
			'vite.config.*',
			'knip.config.*'
		],
		// Disable type-aware rules — config files aren't in the TS project graph.
		...ts.configs.disableTypeChecked,
		rules: {
			'no-console': 'off',
			'no-restricted-syntax': 'off',
			'no-restricted-imports': 'off',
			'no-restricted-globals': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-misused-promises': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/await-thenable': 'off',
			'@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/no-import-type-side-effects': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off'
		}
	},
	// ─── Icon registry gate (CLAUDE.md rule 5) ─────────────────
	{
		files: ['src/**/*.{ts,svelte}'],
		ignores: ['src/lib/icons/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'lucide-svelte',
							message:
								"Import icons from '$icons' (the registry) instead. Add new icons to src/lib/icons/index.ts."
						},
						{
							name: '$app/stores',
							message: '$app/stores is deprecated — use $app/state instead.'
						}
					]
				}
			]
		}
	},
	// ─── Server-only bootstrap modules ──────────────────────────
	// src/lib/server/* runs at SvelteKit boot, not as API gateway. It
	// throws raw new Error for config validation (no caller exists to
	// pattern-match on subclass) — exempt from the typed-error ban.
	{
		files: [
			'src/lib/server/**/*.ts',
			'src/hooks.server.ts',
			'src/routes/**/+server.ts',
			'src/routes/**/+page.server.ts',
			'src/routes/**/+layout.server.ts'
		],
		rules: {
			'no-restricted-syntax': 'off'
		}
	},
	// ─── Components MUST NOT import from $api/client (rule 1) ───
	{
		files: [
			'src/lib/components/**/*.{ts,svelte}',
			'src/lib/layouts/**/*.{ts,svelte}',
			'src/lib/features/**/components/**/*.{ts,svelte}',
			'src/routes/**/*.{ts,svelte}'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '$api/client',
							message:
								'Components must not import $api/client directly. Use a feature gateway in $features/<name>/api.ts (CLAUDE.md layering rule 1).'
						},
						{
							name: 'lucide-svelte',
							message: "Import icons from '$icons' (the registry) instead."
						},
						{
							name: '$app/stores',
							message: '$app/stores is deprecated — use $app/state instead.'
						}
					]
				}
			]
		}
	},
	// ─── BFF-only `fetch` discipline (CLAUDE.md rule 6) ─────────
	// Direct `fetch(...)` calls are forbidden outside the API client,
	// SvelteKit BFF route handlers (src/routes/**/+server.ts), and feature
	// gateways (src/lib/features/<x>/api.ts) — which ARE the gateway layer
	// and may legitimately hit BFF endpoints directly.
	{
		files: ['src/**/*.{ts,svelte}'],
		ignores: [
			'src/lib/api/**',
			'src/lib/features/*/api.ts',
			'src/lib/features/*/*/api.ts',
			'src/lib/features/auth/stores/session.svelte.ts',
			'src/routes/**/+server.ts',
			'src/routes/**/+page.server.ts',
			'src/routes/**/+layout.server.ts',
			'src/hooks.server.ts',
			'src/hooks.client.ts'
		],
		rules: {
			'no-restricted-globals': [
				'error',
				{
					name: 'fetch',
					message:
						'Direct fetch() is forbidden outside $api/client + feature gateways + BFF route handlers. Go through a feature gateway (src/lib/features/<name>/api.ts) — CLAUDE.md rule 6.'
				}
			]
		}
	}
);
