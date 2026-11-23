/**
 * A private copy of the BUILT server (`build/index.js`) for a spec that needs an environment the
 * shared e2e server (port 4173, NODE_ENV=test) does not have: another NODE_ENV, another
 * PUBLIC_SITE_URL. Each copy listens on a free port, its output is kept for the failure message,
 * and `stopBuiltServer` waits for it to exit and proves the port is free again.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { connect, createServer } from 'node:net';
import { expect } from '@playwright/test';

export type BuiltServer = {
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

export function portBound(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const s = connect({ port, host: '127.0.0.1' });
		s.once('connect', () => (s.destroy(), resolve(true)));
		s.once('error', () => resolve(false));
	});
}

/** Start the built server on a free port with the environment `env(port)` returns (PORT is added). */
export async function spawnBuiltServer(
	env: (port: number) => Record<string, string>
): Promise<BuiltServer> {
	const port = await freePort();
	const child = spawn(process.execPath, ['build/index.js'], {
		env: { ...process.env, ...env(port), PORT: String(port) },
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
export async function waitUntilUp(run: BuiltServer): Promise<void> {
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

export async function stopBuiltServer(run: BuiltServer): Promise<void> {
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
