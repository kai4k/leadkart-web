import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — multi-browser e2e against the production build.
 *
 * Browsers: chromium / firefox / webkit (matrix in CI; locally
 * `npm run test:e2e -- --project=chromium` for fast iteration).
 *
 * Server: `npm run preview` on port 4173. baseURL MUST match.
 * `npm run build` is a prerequisite (CI handles via artifact
 * download; locally run `npm run build` first).
 *
 * `reuseExistingServer: !process.env.CI` — locally a running preview
 * is reused for fast iteration; CI always starts fresh.
 */
export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	// Single retry in CI catches genuinely flaky tests (timing windows,
	// resource contention) without burning two re-runs on real bugs.
	// 0 retries locally — if a test is flaky, fix the test, don't
	// paper over it with re-runs.
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } }
	],
	webServer: {
		command: 'npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		stdout: 'pipe',
		stderr: 'pipe',
		timeout: 60_000
	}
});
