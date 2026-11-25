/**
 * `scripts/brand/generate-icons.mjs`: the static icons and the theme colour come from the Iris tokens.
 * `--check` exits 1 on drift (a hand-typed theme colour, a missing or edited icon) and 0 on a clean tree.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = 'scripts/brand/generate-icons.mjs';
const dirs: string[] = [];
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** A copy of what the script writes (static/ and src/app.html), so a test can edit it. */
function copyOutputs(): string {
	const out = mkdtempSync(join(tmpdir(), 'lk-icons-'));
	dirs.push(out);
	cpSync('static', join(out, 'static'), { recursive: true });
	cpSync('src/app.html', join(out, 'src', 'app.html'));
	return out;
}
const check = (out?: string) =>
	spawnSync(process.execPath, [SCRIPT, '--check', ...(out ? ['--out', out] : [])], {
		encoding: 'utf8'
	});

describe('generate-icons --check', () => {
	it('exits 0 on the committed assets', () => {
		const r = check();
		expect(r.stderr).toBe('');
		expect(r.status).toBe(0);
	});

	it('exits 1 when the manifest theme_color differs from the Iris primary', () => {
		const out = copyOutputs();
		const file = join(out, 'static', 'manifest.webmanifest');
		writeFileSync(
			file,
			readFileSync(file, 'utf8').replace(
				/"theme_color": "#[0-9A-Fa-f]{6}"/,
				'"theme_color": "#2563EB"'
			)
		);
		const r = check(out);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('theme_color');
	});

	it('exits 1 when app.html theme-color differs', () => {
		const out = copyOutputs();
		const file = join(out, 'src', 'app.html');
		writeFileSync(
			file,
			readFileSync(file, 'utf8').replace(
				/(name="theme-color" content=")#[0-9A-Fa-f]{6}/,
				'$1#2563EB'
			)
		);
		const r = check(out);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('theme-color');
	});

	it('exits 1 when favicon.svg was edited by hand', () => {
		const out = copyOutputs();
		const file = join(out, 'static', 'favicon.svg');
		writeFileSync(file, `${readFileSync(file, 'utf8')}<!-- hand edit -->`);
		const r = check(out);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('favicon.svg');
	});

	it('exits 1 when a PNG is missing', () => {
		const out = copyOutputs();
		rmSync(join(out, 'static', 'maskable-512x512.png'));
		const r = check(out);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain('maskable-512x512.png');
	});

	it('the theme colour is the Iris --primary, written by the script (no hex in the script)', () => {
		const source = readFileSync(SCRIPT, 'utf8');
		expect(source).not.toMatch(/#[0-9a-fA-F]{6}\b/);
		expect(source).not.toMatch(/oklch\(|rgb\(/);
	});
});
