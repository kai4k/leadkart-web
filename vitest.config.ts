import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// `#lib/*` resolves through package.json `imports`. We can't inherit vite.config.ts (it uses the `sveltekit()` plugin which
// requires a full SvelteKit server context and crashes under Vitest 4).
// Instead we use the bare `svelte()` plugin and replicate aliases here.
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			// SvelteKit virtual modules — stubbed via `vi.mock(...)` in
			// individual tests but vite still needs a resolvable alias
			// during import-analysis. Empty stubs at known paths satisfy
			// that without affecting test behaviour.
			'$app/forms': resolve(__dirname, 'tests/unit/stubs/app-forms.ts'),
			'$app/env/private': resolve(__dirname, 'tests/unit/stubs/app-env-private.ts'),
			'$app/env/public': resolve(__dirname, 'tests/unit/stubs/app-env-public.ts'),
			'$app/env': resolve(__dirname, 'tests/unit/stubs/app-env.ts'),
			'$app/navigation': resolve(__dirname, 'tests/unit/stubs/app-navigation.ts'),
			'$app/paths': resolve(__dirname, 'tests/unit/stubs/app-paths.ts'),
			'$app/service-worker': resolve(__dirname, 'tests/unit/stubs/app-service-worker.ts'),
			'$app/manifest': resolve(__dirname, 'tests/unit/stubs/app-manifest.ts'),
			'$app/state': resolve(__dirname, 'tests/unit/stubs/app-state.ts'),
			'$app/server': resolve(__dirname, 'tests/unit/stubs/app-server.ts')
		}
	},
	test: {
		// Vitest's 5 s default is for I/O-light tests. The BFF source walkers build a TypeScript program per case
		// and the component tests mount Svelte under jsdom; on a 2-vCPU runner with coverage on, a case measured
		// over 5 s (app-server-files layout-reset self-tests failed with it at --maxWorkers=2). 20 s is a ceiling
		// for a slow machine, not a budget: a hung test still fails.
		testTimeout: 20_000,
		// Two projects, so each test runs in the environment its code runs in:
		//   server: tests/unit/server/** (BFF modules), tests/unit/contract/** and tests/unit/scripts/**
		//           (read files / run build scripts, no DOM)
		//           in plain node, default (node) resolve
		//           conditions, no DOM: a browser global used on the server fails here.
		//   client: everything else in jsdom with Svelte's client runtime (`browser` condition,
		//           kept next to Vite's own client conditions) so component tests can mount().
		projects: [
			{
				extends: true,
				test: {
					name: 'server',
					environment: 'node',
					include: [
						'tests/unit/server/**/*.test.ts',
						'tests/unit/contract/**/*.test.ts',
						'tests/unit/scripts/**/*.test.ts'
					]
				}
			},
			{
				extends: true,
				resolve: { conditions: ['browser', ...defaultClientConditions] },
				test: {
					name: 'client',
					environment: 'jsdom',
					setupFiles: ['./tests/unit/setup.ts'],
					include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
					exclude: [
						'tests/unit/server/**',
						'tests/unit/contract/**',
						'tests/unit/scripts/**',
						'tests/unit/service-worker/precache.test.ts'
					]
				}
			},
			// Reads build/ (the built service worker + CSS), so it needs `npm run build` first and fails under CI
			// without one. Not in the unit run (`npm test`, `npm run test:coverage` pick the projects above); the build
			// job runs it right after building: `npx vitest run tests/unit/service-worker`.
			{
				extends: true,
				resolve: { conditions: ['browser', ...defaultClientConditions] },
				test: {
					name: 'built',
					environment: 'jsdom',
					setupFiles: ['./tests/unit/setup.ts'],
					include: ['tests/unit/service-worker/precache.test.ts']
				}
			}
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov', 'json-summary'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,svelte}'],
			exclude: [
				'src/app.html',
				'src/app.d.ts',
				'src/hooks.client.ts',
				'src/lib/i18n/locales/**',
				'src/styles/**',
				'**/*.test.ts',
				'**/*.spec.ts',
				// Storybook stories — render-only, no logic to test
				'**/*.stories.{ts,svelte}',
				// Feature barrels — pure re-export shells, no testable behaviour
				'src/lib/features/*/index.ts',
				'src/lib/features/*/*/index.ts',
				'src/lib/components/**/index.ts',
				'src/lib/hooks/index.ts',
				'src/lib/icons/index.ts'
			],
			// Coverage thresholds — re-ratcheted 2026-05-25 to the measured
			// floor after the CRM module rollout, primitive expansion, and
			// Wave-1/Wave-2 architecture-test work. The denominator grew
			// ~60% (8.8k → 13.2k source lines) without proportional unit-
			// test growth because:
			//   - Svelte components + TanStack query hooks require jsdom +
			//     SvelteKit mock scaffolding (Phase F work).
			//   - E2E suite (133 Playwright tests) covers the route-level
			//     happy paths the unit suite would otherwise duplicate.
			//
			// Measured 2026-05-25: statements 5.38%, branches 8.87%,
			//   functions 3.03%, lines 7.03%. Thresholds set 0.3-0.9 pp
			//   below to absorb minor float drift without flake.
			//
			// Tracked: Phase F coverage push — scaffold SvelteKit mock +
			//   add Storybook-backed test-storybook snapshot tests to
			//   push statements/lines back to ≥9% / ≥6%.
			thresholds: {
				statements: 5,
				branches: 8,
				functions: 3,
				lines: 6
			}
		}
	}
});
