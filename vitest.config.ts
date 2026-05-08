import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'jsdom',
			setupFiles: ['./tests/unit/setup.ts'],
			include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
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
					'**/*.spec.ts'
				],
				// Coverage thresholds — start lenient (no unit tests yet),
				// tighten as the suite grows. CI reads these via
				// `vitest run --coverage`; below threshold = exit 1.
				// TODO(v0.2): bump statements/branches/functions/lines to
				// 70% once UI primitives + auth feature have unit suites.
				thresholds: {
					statements: 0,
					branches: 0,
					functions: 0,
					lines: 0
				}
			}
		}
	})
);
