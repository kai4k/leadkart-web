#!/usr/bin/env node
/**
 * i18n keys-used-exist gate (fix round C item 7).
 *
 * With one enabled locale `check-locale-parity` is vacuous, and nothing else checks that a key the
 * code USES exists: a typo ships as the literal key on screen. This gate reads every
 * `src/**\/*.{ts,svelte}` file (tests and generated code excluded) and requires:
 *
 *   1. LITERAL CALLS   `$_('a.b')`, `_('a.b')`, `$t('a.b')`, `get(_)('a.b')` -> the key is in en.json.
 *   2. KEY-SHAPED STRINGS  every quoted string shaped like a dotted key whose first segment is a
 *      top-level en.json namespace (`'nav.items.team'`, a `titleKey: '...'` in a config table, the
 *      server's `key: 'auth.errors...'`) -> the key is in en.json. This is what covers the config
 *      tables the UI resolves (code-copy, nav, customizer hints, route titles, auth errors).
 *   3. DYNAMIC KEYS    a template literal such as `nav.items.${item.key}` is allowed ONLY through
 *      REGISTRY, whose entry enumerates every possible suffix from the source table; each
 *      expanded key must exist. An unregistered template key fails.
 *
 * REPORT only (never a failure): keys in en.json that nothing references.
 *
 * Exit code: 0 on clean, 1 on any missing key or unregistered dynamic key.
 */
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** All string literals of `src` between `startRe` and `endRe` (a table's body). */
function literalsBetween(src, startRe, endRe) {
	const s = startRe.exec(src);
	if (!s) return [];
	const rest = src.slice(s.index + s[0].length);
	const e = endRe.exec(rest);
	const body = e ? rest.slice(0, e.index) : rest;
	return [...body.matchAll(/'([^'\n]+)'/g)].map((m) => m[1]);
}

/**
 * Every dynamic key family the code builds. `template` is the template literal with each `${...}`
 * reduced to `${}`; `expand(read)` returns every full key it can produce, from the source table.
 * Adding a dynamic key to the code means adding its entry here (or the gate fails).
 */
export const REGISTRY = [
	{
		template: 'errors.code.${}',
		expand: (read) =>
			literalsBetween(read('src/lib/api/code-copy.ts'), /CODES\s*=\s*\[/, /\]\s*as const/).map(
				(c) => `errors.code.${c}`
			)
	},
	{
		template: 'auth.brand.features.${}',
		expand: (read) =>
			[...read('src/lib/layouts/AuthBrandPanel.svelte').matchAll(/key:\s*'(\w+)'/g)].map(
				(m) => `auth.brand.features.${m[1]}`
			)
	},
	{
		template: 'nav.sections.${}',
		expand: (read) =>
			[...read('src/lib/config/nav.ts').matchAll(/\{\s*id:\s*'(\w+)',\s*title:/g)].map(
				(m) => `nav.sections.${m[1]}`
			)
	},
	{
		template: 'nav.items.${}',
		expand: (read) => {
			const src = read('src/lib/config/nav.ts');
			const start = src.indexOf('export const NAV_ROUTES = {');
			const end = src.indexOf('} as const', start);
			const body = start < 0 ? '' : src.slice(start, end < 0 ? undefined : end);
			return [...body.matchAll(/^\t(\w+): \{/gm)].map((m) => `nav.items.${m[1]}`);
		}
	},
	{
		template: 'reload.${}.title',
		expand: (read) => reloadKinds(read).map((k) => `reload.${k}.title`)
	},
	{
		template: 'reload.${}.body',
		expand: (read) => reloadKinds(read).map((k) => `reload.${k}.body`)
	},
	{
		template: 'reload.${}.action',
		expand: (read) => reloadKinds(read).map((k) => `reload.${k}.action`)
	},
	{
		template: 'customizer.${}.title',
		expand: (read) => preferenceAxes(read).map(([k]) => `customizer.${k}.title`)
	},
	{
		template: 'customizer.${}.${}',
		expand: (read) =>
			preferenceAxes(read).flatMap(([k, vs]) => vs.map((v) => `customizer.${k}.${v}`))
	}
];

function reloadKinds(read) {
	const m = /type ResetBlockKind\s*=\s*([^;]+);/.exec(read('src/lib/api/reset-block.svelte.ts'));
	return m ? [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]) : [];
}

function preferenceAxes(read) {
	const src = read('src/lib/features/preferences/schema.ts');
	const start = src.indexOf('export const PREFERENCE_VALUES = {');
	const end = src.indexOf('} as const', start);
	if (start < 0) return [];
	return [...src.slice(start, end).matchAll(/^\t(\w+): \[([^\]]*)\]/gm)].map((m) => [
		m[1],
		[...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])
	]);
}

/** Source with comments blanked (newlines kept): a key mentioned in a comment is not a use. */
export function stripComments(src) {
	const blank = (m) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(^|[\s;{}(,])\/\/[^\n]*/g, (m, p) => p + blank(m.slice(p.length)));
}

function flatten(obj, prefix = '', out = new Set()) {
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (v && typeof v === 'object') flatten(v, key, out);
		else out.add(key);
	}
	return out;
}

/**
 * Dotted strings that LOOK like keys but are not: permission names (`orders.quotations.read` shares a
 * top-level word with the `orders` namespace) and a transport sentinel code. Each is exact, with the reason.
 */
export const NOT_KEYS = {
	files: [
		'src/lib/features/auth/permissions.ts', // permission names
		'src/lib/features/roles/permissions-catalogue.ts' // permission names + English descriptions
	],
	strings: ['auth.refresh_failed'] // REFRESH_FAILED: a client sentinel code, never shown
};

const KEY_SHAPE = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/;
const LITERAL_CALL = /(?<![\w.$])(?:\$_|\$t|_|get\(_\))\(\s*(['"])([^'"\n]+)\1/g;
const STRING_LITERAL = /(['"])((?:(?!\1)[^\\\n])*)\1/g;
const TEMPLATE = /`([a-z][A-Za-z0-9]*\.[^`\n]*\$\{[^`\n]*)`/g;

/**
 * @param {{ files: Map<string,string>, en: object, read: (p: string) => string, registry?: typeof REGISTRY }} input
 * @returns {{ problems: string[], used: Set<string>, checked: number, unused: string[] }}
 */
export function checkI18nKeys({ files, en, read, registry = REGISTRY }) {
	const keys = flatten(en);
	const namespaces = new Set(Object.keys(en));
	const used = new Set();
	const registered = new Set();
	const problems = [];
	let checked = 0;

	const need = (key, where) => {
		checked++;
		used.add(key);
		if (!keys.has(key) && !hasChildren(keys, key)) problems.push(`${where}: missing key "${key}"`);
	};

	for (const [path, raw] of files) {
		const src = stripComments(raw);
		const lineOf = (i) => src.slice(0, i).split('\n').length;
		const seen = new Set();
		for (const m of src.matchAll(LITERAL_CALL)) {
			seen.add(m.index);
			need(m[2], `${path}:${lineOf(m.index)}`);
		}
		for (const m of src.matchAll(STRING_LITERAL)) {
			const text = m[2];
			if (NOT_KEYS.files.includes(path) || NOT_KEYS.strings.includes(text)) continue;
			if (!KEY_SHAPE.test(text) || !namespaces.has(text.split('.')[0])) continue;
			if (keys.has(text)) {
				used.add(text);
				checked++;
				continue;
			}
			// already reported as a literal call at the same place? (the call regex starts earlier)
			if (problems.some((p) => p.endsWith(`missing key "${text}"`) && p.startsWith(`${path}:`)))
				continue;
			need(text, `${path}:${lineOf(m.index)}`);
		}
		for (const m of src.matchAll(TEMPLATE)) {
			const template = m[1].replace(/\$\{[^}]*\}/g, '${}');
			if (!namespaces.has(template.split('.')[0])) continue;
			const entry = registry.find((r) => r.template === template);
			if (!entry) {
				problems.push(
					`${path}:${lineOf(m.index)}: dynamic key \`${m[1]}\` is not in the registry (scripts/arch/check-i18n-keys.mjs REGISTRY)`
				);
				continue;
			}
			registered.add(entry);
		}
	}

	for (const entry of registry) {
		if (!registered.has(entry)) continue;
		const expanded = entry.expand(read);
		if (expanded.length === 0)
			problems.push(`registry "${entry.template}" enumerated no keys (its source table moved?)`);
		for (const key of expanded) need(key, `registry ${entry.template}`);
	}

	const unused = [...keys].filter((k) => !used.has(k));
	return { problems, used, checked, unused };
}

function hasChildren(keys, key) {
	const p = `${key}.`;
	for (const k of keys) if (k.startsWith(p)) return true;
	return false;
}

function main() {
	const files = new Map();
	for (const rel of globSync('src/**/*.{ts,svelte}', { cwd: ROOT })) {
		const norm = rel.replaceAll('\\', '/');
		if (norm.includes('/generated/') || /\.(test|spec)\.ts$/.test(norm)) continue;
		files.set(norm, readFileSync(join(ROOT, rel), 'utf8'));
	}
	const en = JSON.parse(readFileSync(join(ROOT, 'src/lib/i18n/locales/en.json'), 'utf8'));
	const read = (p) => readFileSync(join(ROOT, p), 'utf8');
	const { problems, checked, unused } = checkI18nKeys({ files, en, read });
	if (unused.length > 0)
		console.log(
			`  note: ${unused.length} key(s) of en.json are referenced nowhere (reported only): ${unused.slice(0, 8).join(', ')}${unused.length > 8 ? ', ...' : ''}`
		);
	if (problems.length > 0) {
		console.error(`✗ check-i18n-keys: ${problems.length} problem(s):\n`);
		for (const p of problems) console.error(`  ${p}`);
		process.exit(1);
	}
	console.log(
		`✓ check-i18n-keys: ${checked} key use(s) in ${files.size} file(s) all exist in en.json (${REGISTRY.length} dynamic famil(ies) registered).`
	);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
