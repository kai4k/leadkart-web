import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — multi-browser e2e + chromium-only visual regression.
 *
 * Two test suites share one process:
 *   1. e2e (tests/e2e/) — behaviour against the production build.
 *      Cross-browser matrix in CI (chromium / firefox / webkit) so the
 *      auth + CRUD surfaces are verified on every JS engine.
 *   2. visual (tests/visual/) — pixel-diff snapshots, chromium only.
 *      Visual diffs across browsers are noise (different font hinting,
 *      sub-pixel rounding); the canonical industry pattern is to pin
 *      one rendering engine and assume the others render visually
 *      similar (Playwright docs, Vercel Argos-CI, Chromatic all do this).
 *
 * Two backend servers run in parallel:
 *   1. Mock Go API (:9999) — programmatic fixtures via /_mock/* control
 *      plane. The BFF calls this for every server-to-server fetch.
 *   2. SvelteKit preview (:4173) — adapter-node build, GO_API_URL points
 *      at the mock above.
 *
 * `reuseExistingServer: !process.env.CI` — local dev reuses a running
 * server for fast iteration; CI always starts fresh.
 */
export default defineConfig({
	timeout: 30_000,
	expect: {
		// Default per-snapshot strictness. Individual specs can tighten
		// further via the SNAPSHOT_OPTIONS constant in tests/visual/fixtures.
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.001,
			threshold: 0.1,
			animations: 'disabled'
		}
	},
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
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
		// ── e2e (behaviour, cross-browser) ────────────────────────────
		{
			name: 'chromium',
			testDir: './tests/e2e',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			testDir: './tests/e2e',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			testDir: './tests/e2e',
			use: { ...devices['Desktop Safari'] }
		},
		// ── a11y deep (axe-core on every route, chromium only) ───────
		// Separate project so `npx playwright test --project=a11y` runs
		// the WCAG 2.2 AA suite independently. Chromium only — axe is
		// rendering-engine-independent and re-running across browsers
		// adds runtime without adding signal.
		{
			name: 'a11y',
			testDir: './tests/a11y',
			use: { ...devices['Desktop Chrome'] }
		},
		// ── visual (pixel-diff, chromium only) ────────────────────────
		// Same browser engine as `chromium` above, but the testDir is
		// `./tests/visual` so it's invokable independently via:
		//   `npx playwright test --project=visual`
		// Snapshots write to `tests/visual/**/__screenshots__/` keyed
		// per test file, OS, and project name — see
		// `tests/visual/fixtures/stability.ts` for the canonical
		// stability primitives every visual test consumes.
		{
			name: 'visual',
			testDir: './tests/visual',
			use: {
				...devices['Desktop Chrome'],
				// Override the viewport set by devices so each spec can
				// pin per-test viewport via test.use({ viewport }). The
				// device default would otherwise leak into the first
				// snapshot before the per-test override applies.
				viewport: { width: 1280, height: 800 }
			}
		}
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
