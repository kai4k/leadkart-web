import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — multi-browser e2e against the production build.
 *
 * Two servers run in parallel:
 *   1. Mock Go API (port 9999) — programmatic fixtures via /_mock/* control
 *      plane. The BFF calls this for every server-to-server fetch.
 *   2. SvelteKit preview (port 4173) — adapter-node build, configured with
 *      GO_API_URL=http://localhost:9999 so its proxy + scope routes call
 *      the mock above.
 *
 * Browsers: chromium / firefox / webkit (matrix in CI; locally
 * `npm run test:e2e -- --project=chromium` for fast iteration).
 *
 * `reuseExistingServer: !process.env.CI` — locally a running server is
 * reused for fast iteration; CI always starts fresh.
 */
export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
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
	webServer: [
		{
			command: 'node tests/e2e/mock-server/server.mjs',
			port: 9999,
			reuseExistingServer: !process.env.CI,
			stdout: 'pipe',
			stderr: 'pipe',
			timeout: 10_000
		},
		{
			command: 'node build/index.js',
			port: 4173,
			reuseExistingServer: !process.env.CI,
			stdout: 'pipe',
			stderr: 'pipe',
			timeout: 60_000,
			env: {
				GO_API_URL: 'http://localhost:9999',
				NODE_ENV: 'test',
				ORIGIN: 'http://localhost:4173',
				PORT: '4173'
			}
		}
	]
});
