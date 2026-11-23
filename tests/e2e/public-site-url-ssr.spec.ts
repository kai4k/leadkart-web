import { expect, test } from '@playwright/test';
import {
	portBound,
	spawnBuiltServer,
	stopBuiltServer as stop,
	waitUntilUp as waitUp,
	type BuiltServer as Run
} from './helpers/built-server';

/**
 * PUBLIC_SITE_URL is substituted unescaped into src/app.html, so a value that is not exactly an origin must STOP the
 * server (in every environment: these cases run with NODE_ENV=test), naming the variable, and never reach an attribute.
 * Each case starts its own copy of the built server on a free port, watches the child, and waits for it to exit before
 * the next case. A clean origin is rendered as is; empty degrades to root-relative. No browser is used.
 */
test.skip(
	({ browserName }) => browserName !== 'chromium',
	'no browser is used: one project is enough'
);

/** The shared e2e environment with one PUBLIC_SITE_URL (helpers/built-server.ts starts and watches the copy). */
const spawnServer = (value: string): Promise<Run> =>
	spawnBuiltServer((port) => ({
		GO_API_URL: 'http://localhost:9999',
		NODE_ENV: 'test',
		SCOPE_COOKIE_SECRET: 'e2e-only-scope-cookie-secret-0123456789abcdef',
		ORIGIN: `http://localhost:${port}`,
		PUBLIC_SITE_URL: value
	}));

const MALFORMED = [
	'"><script>alert(1)</script>',
	'https://a.example/"onload=alert(1)',
	'https://a.example/path',
	'https://user:pw@a.example',
	'//a.example',
	['java', 'script:alert(1)'].join(''),
	'https://a.example/'
];

test.describe('PUBLIC_SITE_URL at start-up and in the SSR link-preview tags', () => {
	test.describe.configure({ mode: 'serial' });
	let run: Run | undefined;
	test.afterEach(async () => {
		if (run) await stop(run);
		run = undefined;
	});

	for (const value of MALFORMED)
		test(`a malformed value stops the server and names the variable: ${value}`, async () => {
			run = await spawnServer(value);
			const timeout = new Promise((r) => setTimeout(r, 15000, 'timeout'));
			const code = await Promise.race([run.exited, timeout]);
			expect(code, `the server did not exit:\n${run.output()}`).not.toBe('timeout');
			expect(code).not.toBe(0);
			expect(run.output()).toContain('PUBLIC_SITE_URL must be a bare origin');
			expect(await portBound(run.port)).toBe(false);
		});

	test('a clean origin is rendered as is', async () => {
		run = await spawnServer('https://app.example.com');
		await waitUp(run);
		const html = await (await fetch(`http://localhost:${run.port}/signin`)).text();
		expect(html).toContain(
			'<meta property="og:image" content="https://app.example.com/og-image-light.png"'
		);
		expect(html).toContain(
			'<meta name="twitter:image" content="https://app.example.com/og-image-light.png"'
		);
		expect(html).not.toContain('og:url');
	});

	test('an empty value starts and renders root-relative image URLs', async () => {
		run = await spawnServer('');
		await waitUp(run);
		const html = await (await fetch(`http://localhost:${run.port}/signin`)).text();
		expect(html).toContain('<meta property="og:image" content="/og-image-light.png"');
	});
});
