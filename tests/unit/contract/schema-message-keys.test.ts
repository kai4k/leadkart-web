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

/**
 * What `messages()` cannot read: a message that is not a quoted literal, so no key can be checked. A template literal
 * and an identifier or call (`.min(1, requiredMessage)`) are reported here instead of passing unseen.
 * What stays invisible: the VALUE an identifier holds (only its name is seen, so each is listed in DYNAMIC_OK with
 * where its value comes from), a message set by `ctx.addIssue({ message })` inside a `superRefine` whose value is
 * computed elsewhere (only `message:` / `error:` values written in the file are seen), and a rule with NO message at
 * all (`z.string().min(1)` reads as a Zod default at run time; the sweep test covers those).
 */
const MESSAGE_ARG_INDEX: Record<string, number> = {
	min: 1,
	max: 1,
	length: 1,
	gte: 1,
	lte: 1,
	gt: 1,
	lt: 1,
	multipleOf: 1,
	regex: 1,
	refine: 1,
	int: 0,
	positive: 0,
	nonnegative: 0,
	negative: 0,
	nonpositive: 0,
	email: 0,
	url: 0,
	uuid: 0,
	nonempty: 0
};
function topLevelArgs(args: string): string[] {
	const out: string[] = [];
	let depth = 0;
	let quote = '';
	let cur = '';
	for (const c of args) {
		if (quote) {
			cur += c;
			if (c === quote) quote = '';
			continue;
		}
		if (c === "'" || c === '"' || c === '`') quote = c;
		if ('([{'.includes(c)) depth++;
		if (')]}'.includes(c)) depth--;
		if (c === ',' && depth === 0) {
			out.push(cur.trim());
			cur = '';
		} else cur += c;
	}
	if (cur.trim()) out.push(cur.trim());
	return out;
}
const isQuoted = (a: string) => /^(?:'[^'\n]*'|"[^"\n]*")$/.test(a);
/** Messages the check cannot verify: a template literal, an identifier, a call. */
export function unreadableMessages(withPaths: string): string[] {
	const found: string[] = [];
	const source = withPaths.replace(/path:\s*\[[^\]]*\]/g, '');
	const rules = /(?<!Math)\.(\w+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g; // Math.max(1, x) is not a rule
	for (const m of source.matchAll(rules)) {
		const at = MESSAGE_ARG_INDEX[m[1]];
		if (at === undefined) continue;
		const arg = topLevelArgs(m[2])[at];
		if (arg === undefined || arg === '' || isQuoted(arg) || arg.startsWith('{')) continue;
		if (/^-?[\d.]+$/.test(arg) || /^\//.test(arg)) continue; // a numeric bound, a regex literal
		found.push(arg);
	}
	for (const m of source.matchAll(/\b(?:message|error):\s*([^,}\n]+)/g)) {
		const v = m[1].trim();
		if (!isQuoted(v) && !/^(?:z\.|\(|\{)/.test(v)) found.push(v);
	}
	return found;
}

/** Messages that are not a literal on purpose, with where their value comes from. */
const DYNAMIC_OK: Record<string, string[]> = {
	// `message: code`: Go's own password rule code (min_length, requires_digit...), turned into a sentence by the mapper; the sweep test runs it
	'lib/features/operator/tenants/schemas.ts': ['code'],
	// currentPasswordField(requiredMessage = 'auth.errors.passwordRequired'): its two callers pass a key or the default key
	'lib/api/request-schema.ts': ['requiredMessage']
};

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
			const unreadable = unreadableMessages(stripComments(readFileSync(file, 'utf8'))).filter(
				(m) => !(DYNAMIC_OK[rel] ?? []).includes(m)
			);
			expect(unreadable, 'a message the check cannot read (template literal, identifier)').toEqual(
				[]
			);
		});
	}
});

describe('the check sees what it used to miss', () => {
	it('a template literal and an identifier are reported', () => {
		expect(unreadableMessages('z.string().min(1, `form.${x}`)')).toEqual(['`form.${x}`']);
		expect(unreadableMessages('z.string().min(1, requiredMessage)')).toEqual(['requiredMessage']);
		expect(unreadableMessages('z.string().max(10, { message: someKey })')).toEqual(['someKey']);
	});
	it('a quoted key, a numeric bound and a regex with its key are not', () => {
		expect(unreadableMessages("z.string().min(1, 'form.required').max(10)")).toEqual([]);
		expect(unreadableMessages("z.string().regex(/^a$/, 'form.errors.slugCharacters')")).toEqual([]);
	});
});
