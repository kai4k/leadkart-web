import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../../../src/lib/i18n/locales/en.json';
import { isCopyKey } from '../../../src/lib/utils/field-error-copy.ts';

/**
 * Every message a schema in `src` can produce is a catalogue key that `en.json` has. A sentence written into a schema
 * (`.min(1, 'Enter a name.')`) would be refused by the one mapper (`fieldMessageText`) and read "Check this value.", so it
 * fails here instead; a key missing from `en.json` fails here too (at run time it also reads "Check this value.").
 */
const SRC = join(process.cwd(), 'src');
/** Files that use zod but never show a message to a user: server start-up validation and wire-shape guards. */
const NOT_USER_FACING = new Set(['lib/server/config.ts']);

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) {
			if (entry === 'generated') continue;
			walk(p, out);
		} else if (/\.(ts|svelte)$/.test(p)) out.push(p);
	}
	return out;
}

const flatten = (o: unknown, prefix = '', out = new Set<string>()): Set<string> => {
	if (o && typeof o === 'object')
		for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
	else out.add(prefix);
	return out;
};
const catalogue = flatten(en);

const stripComments = (s: string) =>
	s
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
		.replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/** The string literals handed to a zod rule as its message: `.min(1, '…')`, `{ message: '…' }`, `{ error: '…' }`. */
function messages(withPaths: string): string[] {
	const found: string[] = [];
	// `path: ['expires_at']` names a field, it is not a message
	const source = withPaths.replace(/path:\s*\[[^\]]*\]/g, '');
	const rules =
		/\.(?:min|max|length|regex|int|gte|lte|gt|lt|positive|nonnegative|negative|nonpositive|email|url|uuid|refine|nonempty|multipleOf|check)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
	for (const m of source.matchAll(rules))
		for (const lit of m[1].matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) found.push(lit[1] ?? lit[2]);
	for (const m of source.matchAll(/\b(?:message|error):\s*(?:'([^'\n]*)'|"([^"\n]*)")/g))
		found.push(m[1] ?? m[2]);
	return found;
}

const files = walk(SRC).filter((f) => {
	const rel = relative(SRC, f).replaceAll('\\', '/');
	if (NOT_USER_FACING.has(rel)) return false;
	return /from 'zod'/.test(readFileSync(f, 'utf8'));
});

describe('every message a schema can produce is a catalogue key', () => {
	it('finds the schema files', () => {
		expect(files.length).toBeGreaterThanOrEqual(25);
	});

	for (const file of files) {
		const rel = relative(SRC, file).replaceAll('\\', '/');
		it(rel, () => {
			const found = messages(stripComments(readFileSync(file, 'utf8')));
			const sentences = found.filter((m) => !isCopyKey(m));
			expect(sentences, 'a message that is not a key').toEqual([]);
			const missing = found.filter((m) => !catalogue.has(m));
			expect(missing, 'a key en.json lacks').toEqual([]);
		});
	}
});
