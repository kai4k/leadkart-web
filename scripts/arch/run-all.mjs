#!/usr/bin/env node
/**
 * Architecture gate runner — executes every check in scripts/arch/ in
 * parallel and aggregates results. Exits non-zero if any gate fails.
 *
 * Run via `npm run arch:check`. Wired into CI as a hard gate.
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const checks = readdirSync(__dirname)
	.filter((f) => f.startsWith('check-') && f.endsWith('.mjs'))
	.sort();

function runCheck(file) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [join(__dirname, file)], {
			stdio: ['ignore', 'pipe', 'pipe']
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d) => (stdout += d.toString()));
		child.stderr.on('data', (d) => (stderr += d.toString()));
		child.on('close', (code) => resolve({ file, code, stdout, stderr }));
	});
}

const start = Date.now();
const results = await Promise.all(checks.map(runCheck));
const duration = Math.round((Date.now() - start) / 100) / 10;

let failed = 0;
for (const r of results) {
	if (r.code === 0) {
		process.stdout.write(r.stdout);
	} else {
		failed += 1;
		process.stdout.write(r.stdout);
		process.stderr.write(r.stderr);
	}
}

console.log(
	`\n${failed === 0 ? '✓' : '✗'} arch:check — ${results.length - failed}/${results.length} gates passed in ${duration}s.`
);
process.exit(failed === 0 ? 0 : 1);
