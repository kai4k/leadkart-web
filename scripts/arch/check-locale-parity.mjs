#!/usr/bin/env node
/**
 * Locale-key parity gate (arch tests #40-42).
 *
 * Every locale JSON in src/lib/i18n/locales/*.json must have the same
 * key shape as the canonical `en.json`. Empty values are also blocked
 * (catches stubbed translations that ship as `""`).
 *
 * Exit code: 0 on clean, 1 on any key drift or empty value.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LOCALES_DIR = join(ROOT, 'src/lib/i18n/locales');

const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
if (!files.includes('en.json')) {
	console.error('✗ check-locale-parity: en.json missing from src/lib/i18n/locales/');
	process.exit(1);
}

function flatten(obj, prefix = '') {
	const out = new Map();
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
		} else {
			out.set(key, v);
		}
	}
	return out;
}

const en = flatten(JSON.parse(readFileSync(join(LOCALES_DIR, 'en.json'), 'utf8')));
const enKeys = new Set(en.keys());

const errors = [];
for (const [key, val] of en) {
	if (val === '' || val == null) errors.push(`en.json: empty value at "${key}"`);
}

for (const file of files.filter((f) => f !== 'en.json')) {
	const flat = flatten(JSON.parse(readFileSync(join(LOCALES_DIR, file), 'utf8')));
	const localeKeys = new Set(flat.keys());
	for (const k of enKeys) {
		if (!localeKeys.has(k)) errors.push(`${file}: missing key "${k}"`);
	}
	for (const k of localeKeys) {
		if (!enKeys.has(k)) errors.push(`${file}: orphan key "${k}" (not in en.json)`);
	}
	for (const [key, val] of flat) {
		if (val === '' || val == null) errors.push(`${file}: empty value at "${key}"`);
	}
}

if (errors.length === 0) {
	console.log(
		`✓ check-locale-parity: ${files.length} locale(s), ${enKeys.size} keys per locale, all present + non-empty.`
	);
	process.exit(0);
}

console.error(`✗ check-locale-parity: ${errors.length} issue(s):\n`);
for (const e of errors) console.error(`  ${e}`);
process.exit(1);
