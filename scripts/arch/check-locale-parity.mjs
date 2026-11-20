#!/usr/bin/env node
/**
 * Locale-key parity gate (arch tests #40-42).
 *
 * English only for now (owner decision 2026-11-21, plan L46): `ENABLED_LOCALES` in
 * src/lib/i18n/index.ts lists the locales a visitor can get, and parity is enforced among THOSE.
 * A locale that is known but disabled (hi) is frozen: its missing keys and orphan keys are
 * REPORTED, never failed, so a new string needs `en.json` only. Enabling a locale in the constant
 * makes it fully enforced again (same keys as en.json, no empty values).
 *
 * Exit code: 0 on clean, 1 on any key drift or empty value in an enabled locale.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const LOCALES_DIR = join(ROOT, 'src/lib/i18n/locales');
const INDEX = join(ROOT, 'src/lib/i18n/index.ts');

/**
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {Map<string, unknown>}
 */
export function flatten(obj, prefix = '') {
	/** @type {Map<string, unknown>} */
	const out = new Map();
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			for (const [kk, vv] of flatten(/** @type {Record<string, unknown>} */ (v), key))
				out.set(kk, vv);
		} else {
			out.set(key, v);
		}
	}
	return out;
}

/**
 * The locales enabled in the TypeScript constant (read as text: this is a plain node script).
 * @param {string} source
 * @returns {string[] | null}
 */
export function enabledLocalesFrom(source) {
	const m = /ENABLED_LOCALES[^=]*=\s*\[([^\]]*)\]/.exec(source);
	if (!m) return null;
	return [...m[1].matchAll(/'([a-z-]+)'/g)].map((x) => x[1]);
}

/**
 * @param {Record<string, Record<string, unknown>>} dictionaries locale -> parsed JSON (must include `en`)
 * @param {string[]} enabled
 * @returns {{ errors: string[], notes: string[] }} errors fail the gate; notes are reported only
 */
export function checkParity(dictionaries, enabled) {
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const notes = [];
	if (!dictionaries.en) return { errors: ['en.json missing from src/lib/i18n/locales/'], notes };
	if (!enabled.includes('en')) errors.push('ENABLED_LOCALES must contain "en" (the canonical one)');
	const en = flatten(dictionaries.en);
	const enKeys = new Set(en.keys());
	for (const [key, val] of en) {
		if (val === '' || val == null) errors.push(`en.json: empty value at "${key}"`);
	}
	for (const locale of enabled) {
		if (!dictionaries[locale]) errors.push(`${locale}.json: enabled but missing`);
	}
	for (const [locale, dict] of Object.entries(dictionaries)) {
		if (locale === 'en') continue;
		const flat = flatten(dict);
		const isEnabled = enabled.includes(locale);
		const sink = isEnabled ? errors : notes;
		const tag = isEnabled ? '' : ' (disabled locale, reported only)';
		const missing = [...enKeys].filter((k) => !flat.has(k));
		const orphan = [...flat.keys()].filter((k) => !enKeys.has(k));
		if (isEnabled) {
			for (const k of missing) sink.push(`${locale}.json: missing key "${k}"`);
			for (const k of orphan) sink.push(`${locale}.json: orphan key "${k}" (not in en.json)`);
			for (const [key, val] of flat)
				if (val === '' || val == null) sink.push(`${locale}.json: empty value at "${key}"`);
		} else {
			if (missing.length)
				sink.push(`${locale}.json${tag}: ${missing.length} key(s) of en.json are absent`);
			if (orphan.length)
				sink.push(`${locale}.json${tag}: ${orphan.length} key(s) are not in en.json`);
		}
	}
	return { errors, notes };
}

function main() {
	const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json'));
	const enabled = enabledLocalesFrom(readFileSync(INDEX, 'utf8'));
	if (!enabled) {
		console.error('✗ check-locale-parity: ENABLED_LOCALES not found in src/lib/i18n/index.ts');
		process.exit(1);
	}
	/** @type {Record<string, Record<string, unknown>>} */
	const dictionaries = {};
	for (const f of files)
		dictionaries[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(LOCALES_DIR, f), 'utf8'));
	const { errors, notes } = checkParity(dictionaries, enabled);
	for (const n of notes) console.log(`  note: ${n}`);
	if (errors.length === 0) {
		const keys = flatten(dictionaries.en).size;
		console.log(
			`✓ check-locale-parity: enabled [${enabled.join(', ')}], ${keys} keys in en.json, all present + non-empty in every enabled locale.`
		);
		process.exit(0);
	}
	console.error(`✗ check-locale-parity: ${errors.length} issue(s):\n`);
	for (const e of errors) console.error(`  ${e}`);
	process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
