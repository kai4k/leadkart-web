/**
 * `<html data-transparency>` is the Transparency preference. It is written once (the schema's
 * attribute table, emitted by the shell transform) and read only by the material layer's token
 * files: no component and no other stylesheet branches on it, so there is one place that decides
 * what each level means and the contrast gate proves exactly that place.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = /\.(svelte|ts|css|html|js)$/;

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (SOURCE.test(name)) out.push(p.replaceAll('\\', '/'));
	}
	return out;
}

describe('data-transparency has one writer and one reader', () => {
	const files = walk('src').filter((f) => !f.startsWith('src/lib/api/generated/'));
	const mentions = files.filter((f) => /data-transparency/.test(readFileSync(f, 'utf8')));

	it('appears only in the schema and the material token files', () => {
		expect(mentions.sort()).toEqual([
			'src/lib/features/preferences/schema.ts',
			'src/styles/theme/materials-fallbacks.css',
			'src/styles/theme/materials.css'
		]);
	});

	it('is selected on in a stylesheet only by materials.css and its fallbacks', () => {
		for (const f of files.filter((f) => f.endsWith('.css') || f.endsWith('.svelte'))) {
			if (f.startsWith('src/styles/theme/materials')) continue;
			const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
			expect(css, f).not.toMatch(/\[data-transparency/);
		}
	});
});
