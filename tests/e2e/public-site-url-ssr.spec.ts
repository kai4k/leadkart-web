import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { expect, test } from '@playwright/test';

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

type Run = {
	child: ChildProcess;
	port: number;
	output: () => string;
	exited: Promise<number | null>;
	hasExited: () => boolean;
};

function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const srv = createServer();
		srv.once('error', reject);
		srv.listen(0, '127.0.0.1', () => {
			const { port } = srv.address() as { port: number };
			srv.close(() => resolve(port));
		});
	});
}

function portBound(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const s = connect({ port, host: '127.0.0.1' });
		s.once('connect', () => (s.destroy(), resolve(true)));
		s.once('error', () => resolve(false));
	});
}

async function spawnServer(value: string): Promise<Run> {
	const port = await freePort();
	const child = spawn(process.execPath, ['build/index.js'], {
		env: {
			...process.env,
			GO_API_URL: 'http://localhost:9999',
			NODE_ENV: 'test',
			SCOPE_COOKIE_SECRET: 'e2e-only-scope-cookie-secret-0123456789abcdef',
			ORIGIN: `http://localhost:${port}`,
			PUBLIC_SITE_URL: value,
			PORT: String(port)
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let out = '';
	child.stdout?.on('data', (d) => (out += d));
	child.stderr?.on('data', (d) => (out += d));
	let done = false;
	const exited = new Promise<number | null>((resolve) =>
		child.once('close', (code) => {
			done = true;
			resolve(code);
		})
	);
	return { child, port, output: () => out, exited, hasExited: () => done };
}

/** Waits until /signin answers; fails with the child's output if it dies first. */
async function waitUp(run: Run): Promise<void> {
	for (let i = 0; i < 100; i++) {
		if (run.hasExited())
			throw new Error(`server exited early (code ${await run.exited}):\n${run.output()}`);
		try {
			if ((await fetch(`http://localhost:${run.port}/signin`)).ok) return;
		} catch {
			/* not up yet */
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`server did not start:\n${run.output()}`);
}

async function stop(run: Run): Promise<void> {
	if (!run.hasExited()) {
		run.child.kill();
		const timeout = new Promise((r) => setTimeout(r, 5000, 'timeout'));
		if ((await Promise.race([run.exited, timeout])) === 'timeout') {
			run.child.kill('SIGKILL');
			await run.exited;
		}
	}
	expect(await portBound(run.port), `port ${run.port} is free after the server stopped`).toBe(
		false
	);
}

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
