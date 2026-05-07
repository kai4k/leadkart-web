import { defineConfig } from '@playwright/test';

/**
 * Playwright config — runs e2e tests against the production build via
 * `npm run preview` (vite preview, port 4173).
 *
 * baseURL MUST match webServer.port. `npm run build` is a prerequisite
 * (CI workflow runs it before this step; locally `npm run build`
 * before `npm run test:e2e`).
 *
 * `reuseExistingServer: !process.env.CI` — locally a running preview
 * is reused for fast iteration; CI always starts fresh.
 */
export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30_000,
	fullyParallel: true,
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		stdout: 'pipe',
		stderr: 'pipe',
		timeout: 60_000
	}
});
