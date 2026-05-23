import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			'no-undef': 'off',
			// svelte/no-navigation-without-resolve fires on every goto()
			// + href until typed routes (`resolve()`) wraps every nav.
			// Disabled during scaffold; revisit once route surface stable.
			'svelte/no-navigation-without-resolve': 'off',
			// svelte/no-useless-mustaches conflicts with Tailwind class
			// composition — re-enable once we lean fully on cn().
			'svelte/no-useless-mustaches': 'off'
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
		}
	},
	// Icon-registry gate. Direct `lucide-svelte` imports are banned outside
	// the registry — everything goes through `$icons` (= src/lib/icons/) so
	// the icon library stays swappable and the icon-size token wrapper is
	// the single point of size-decision. See CLAUDE.md rule 5.
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
						}
					]
				}
			]
		}
	}
);
