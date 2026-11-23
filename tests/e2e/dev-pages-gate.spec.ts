import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
	spawnBuiltServer,
	stopBuiltServer,
	waitUntilUp,
	type BuiltServer
} from './helpers/built-server';

/**
 * The developer pages (the `(dev)` route group: `/styleguide`, `/data-table-bench`) are not public.
 * The same build answers 404 for them when it runs as production and serves them when it runs as the
 * e2e build (NODE_ENV=test), which the specs that use the styleguide rely on. The production copy is
 * started here on a free port; no browser is used.
 */
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'no browser is used: one project is enough'
);

/** Every page folder of the group as it is on disk, so a page added later is covered without a list. */
const DEV_PAGES = readdirSync(join(process.cwd(), 'src/routes/(dev)'), { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.map((e) => `/${e.name}`);
/** The two the brief names, whether or not the second one is on this branch yet. */
const PATHS = [...new Set(['/styleguide', '/data-table-bench', ...DEV_PAGES])];

test.describe('developer pages are served by vite dev and the e2e build only', () => {
	test.describe.configure({ mode: 'serial' });
	let run: BuiltServer | undefined;
	test.afterEach(async () => {
		if (run) await stopBuiltServer(run);
		run = undefined;
	});

	test('the group has pages to protect', () => {
		expect(DEV_PAGES).toContain('/styleguide');
	});

	test('a production server answers 404 on every developer page (and still serves /signin)', async () => {
		run = await spawnBuiltServer(() => ({
			GO_API_URL: 'http://localhost:9999',
			NODE_ENV: 'production',
			// not the published e2e secret: config refuses that one in production
			SCOPE_COOKIE_SECRET: 'gate-spec-scope-cookie-secret-0123456789abcdef',
			ORIGIN: 'https://app.example.com',
			PUBLIC_SITE_URL: 'https://app.example.com'
		}));
		await waitUntilUp(run);

		for (const path of PATHS) {
			const resp = await fetch(`http://localhost:${run.port}${path}`, { redirect: 'manual' });
			expect(resp.status, path).toBe(404);
			const html = await resp.text();
			// the error page, not the page behind it
			expect(html, path).not.toContain('LeadKart design system');
		}
		// the same for the data request a client-side navigation would make
		const data = await fetch(`http://localhost:${run.port}/styleguide/__data.json`);
		expect(JSON.stringify(await data.json())).toContain('404');
	});

	test('a server with no NODE_ENV is production: 404 as well', async () => {
		run = await spawnBuiltServer(() => ({
			GO_API_URL: 'http://localhost:9999',
			NODE_ENV: '',
			SCOPE_COOKIE_SECRET: 'gate-spec-scope-cookie-secret-0123456789abcdef',
			ORIGIN: 'https://app.example.com',
			PUBLIC_SITE_URL: 'https://app.example.com'
		}));
		await waitUntilUp(run);
		expect((await fetch(`http://localhost:${run.port}/styleguide`)).status).toBe(404);
	});

	test('the e2e build (NODE_ENV=test) still serves them', async ({ baseURL }) => {
		for (const path of DEV_PAGES) {
			const resp = await fetch(`${baseURL}${path}`);
			expect(resp.status, path).toBe(200);
		}
		expect(await (await fetch(`${baseURL}/styleguide`)).text()).toContain('LeadKart design system');
	});
});
