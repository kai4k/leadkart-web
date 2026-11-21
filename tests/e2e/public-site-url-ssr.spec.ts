import { spawn, type ChildProcess } from 'node:child_process';
import { expect, test } from '@playwright/test';

/**
 * PUBLIC_SITE_URL is substituted unescaped into src/app.html, so a hostile value must render an EMPTY origin (the tags
 * degrade to root-relative) and never reach an attribute. Each case starts a SECOND copy of the built server on port 4175
 * with that value and reads the real SSR response of /signin. A clean origin is rendered as is.
 */
const PORT = 4175;

async function serve(value: string, nodeEnv = 'test'): Promise<ChildProcess> {
	const child = spawn(process.execPath, ['build/index.js'], {
		env: {
			...process.env,
			GO_API_URL: 'http://localhost:9999',
			NODE_ENV: nodeEnv,
			SCOPE_COOKIE_SECRET: 'e2e-only-scope-cookie-secret-0123456789abcdef',
			ORIGIN: `http://localhost:${PORT}`,
			PUBLIC_SITE_URL: value,
			PORT: String(PORT)
		},
		stdio: 'ignore'
	});
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(`http://localhost:${PORT}/signin`)).ok) return child;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	child.kill();
	throw new Error('server did not start');
}

const HOSTILE = [
	'"><script>alert(1)</script>',
	'https://a.example/"onload=alert(1)',
	'https://a.example/path',
	'https://user:pw@a.example',
	'//a.example',
	['java', 'script:alert(1)'].join(''),
	'https://a.example/'
];

test.describe('SSR of the link-preview tags', () => {
	test.describe.configure({ mode: 'serial' });
	let child: ChildProcess | undefined;
	test.afterEach(() => {
		child?.kill();
		child = undefined;
	});

	for (const value of HOSTILE)
		test(`a hostile value renders an empty origin: ${value}`, async () => {
			child = await serve(value);
			const html = await (await fetch(`http://localhost:${PORT}/signin`)).text();
			expect(html).toContain('<meta property="og:image" content="/og-image-light.png"');
			expect(html).toContain('<meta name="twitter:image" content="/og-image-light.png"');
			expect(html).not.toContain('alert(1)');
			expect(html).not.toContain('a.example');
			expect(html).not.toContain('onload=');
		});

	test('a clean origin is rendered as is', async () => {
		child = await serve('https://app.example.com');
		const html = await (await fetch(`http://localhost:${PORT}/signin`)).text();
		expect(html).toContain(
			'<meta property="og:image" content="https://app.example.com/og-image-light.png"'
		);
		expect(html).not.toContain('og:url');
	});
});
