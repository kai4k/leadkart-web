#!/usr/bin/env node
/**
 * Legacy token sweep (plan Task 9, L7): rewrites the legacy colour utilities and `--color-*`
 * custom properties to the shadcn-named semantic tokens.
 *
 *   node scripts/codemods/tokens-to-semantic.mjs [--dry]
 *
 * Prints `path: n replacements` per changed file, then every legacy occurrence it could NOT map
 * (a dynamic string, a step with no semantic home) as `file:line`. Exits 0. Idempotent.
 *
 * It rewrites only the legacy names, and only as whole tokens (`text-fg-muted`, not `text-fg-mutedx`),
 * so it can run over hand-written files: it never touches a physical-direction utility, an import,
 * a comment's prose or a string that merely resembles one. A utility keeps its variant prefixes
 * (`hover:`, `dark:`, `data-[…]:`) and its opacity suffix (`/50`).
 *
 * Excluded: `src/lib/layouts/**` (rewritten in Tasks 10-15), `src/styles/theme/**`,
 * `src/styles/tokens.css`, `src/lib/api/generated/**`.
 */
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const EXCLUDED = [
	'src/lib/layouts/',
	'src/styles/theme/',
	'src/styles/tokens.css',
	'src/lib/api/generated/'
];

// ── what a legacy name becomes ─────────────────────────────────────────────

/** Names with a fixed semantic home. The value is the semantic colour name (no prefix, no `--`). */
/** @type {Record<string, string>} */
const FIXED = {
	bg: 'background',
	'bg-elevated': 'card',
	'bg-subtle': 'muted',
	'bg-muted': 'muted',
	fg: 'foreground',
	'fg-muted': 'muted-foreground',
	'fg-subtle': 'muted-foreground',
	'fg-on-brand': 'primary-foreground',
	'primary-fg': 'primary-foreground',
	'border-strong': 'input',
	'focus-ring': 'ring',
	'primary-active': 'primary-hover',
	'brand-heading': 'primary',
	'brand-link': 'primary',
	'brand-link-hover': 'primary-hover'
};

/** `danger` is `destructive`; `secondary` (the logo's neon green) is the success equivalent. */
/** @type {Record<string, string>} */
const STATUS = {
	success: 'success',
	warning: 'warning',
	info: 'info',
	danger: 'destructive',
	secondary: 'success'
};

/** Light tints are the `-soft` fill, every darker step is the solid token (L7). */
/** @param {string} step */
const isTint = (step) => Number(step) <= 200;

/**
 * @param {string} name a legacy name (`bg-muted`, `brand-600`, `danger-700`, `gray-100`, …)
 * @param {string} prefix the utility prefix, or '' for a custom property
 * @returns {string | null} the semantic colour name, or null when it has no home
 */
function semanticFor(name, prefix) {
	if (Object.hasOwn(FIXED, name)) return FIXED[name];
	let m = /^brand-(\d+)$/.exec(name);
	if (m) return isTint(m[1]) ? 'primary-soft' : 'primary';
	m = /^(success|warning|info|danger|secondary)-(\d+)$/.exec(name);
	if (m) {
		const base = STATUS[m[1]];
		if (prefix === 'text' || prefix === 'fill' || prefix === 'stroke' || prefix === 'decoration') {
			return base;
		}
		return isTint(m[2]) ? `${base}-soft` : base;
	}
	m = /^gray-(\d+)$/.exec(name);
	if (m) {
		if (prefix === 'text') return 'muted-foreground';
		if (prefix === 'border' || prefix.startsWith('border-') || prefix === 'divide') return 'border';
		if (prefix === 'bg' && Number(m[1]) <= 200) return 'muted';
		return null;
	}
	return null;
}

/**
 * A border or ring in a status colour keeps a quiet edge (L7: `/40`), except in `ui/` (no alpha).
 * @param {string} name
 * @param {string} prefix
 * @param {boolean} inUi
 */
function statusEdge(name, prefix, inUi) {
	if (inUi) return '';
	if (!(prefix === 'border' || prefix.startsWith('border-') || prefix === 'ring')) return '';
	return /^(success|warning|info|danger|secondary)-\d+$/.test(name) ? '/40' : '';
}

// ── utilities (class strings) ──────────────────────────────────────────────

const NAMES =
	'bg-elevated|bg-subtle|bg-muted|bg|fg-on-brand|fg-muted|fg-subtle|fg|border-strong|focus-ring|' +
	'primary-active|primary-fg|brand-heading|brand-link-hover|brand-link|brand-\\d+|' +
	'(?:success|warning|info|danger|secondary|gray)-\\d+';
const PREFIXES =
	'ring-offset|border-[xytblrse]|bg|text|border|ring|outline|fill|stroke|divide|decoration|shadow|from|via|to|placeholder|caret|accent';
const UTILITY = new RegExp(`(?<![\\w-])(${PREFIXES})-(${NAMES})(?![\\w-])`, 'g');

// ── custom properties (CSS, <style>, arbitrary values, inline style) ───────

const VAR_NAMES = `${NAMES}|border|primary-soft|primary-hover|primary|popover-foreground|popover`;
const CUSTOM_PROPERTY = new RegExp(`(?<![\\w-])--color-(${VAR_NAMES})(?![\\w-])`, 'g');

/** `--color-NAME` -> `--NAME` for the names that are the same token under the new name. */
const SAME_NAME = new Set([
	'border',
	'primary-soft',
	'primary-hover',
	'primary',
	'popover',
	'popover-foreground'
]);

// ── legacy leftovers the mapping could not handle ──────────────────────────

const LEFTOVER = new RegExp(
	[
		// a legacy utility that is still there (a step or a prefix the mapping has no home for)
		`(?<![\\w-])(?:${PREFIXES})-(?:(?:fg|bg)(?:-(?:elevated|muted|subtle|on-brand|strong))?|brand-[a-z0-9-]+|(?:danger|success|warning|info|secondary|gray)-\\d+|focus-ring|primary-(?:fg|active))(?![\\w-])`,
		// a dynamic class built from a legacy name: `text-fg-${tone}`, `bg-danger-${n}`
		`(?<![\\w-])(?:${PREFIXES})-(?:fg|bg|brand|danger|success|warning|info|secondary|gray)-\\$\\{`,
		// a legacy custom property
		'--color-(?:bg|fg|brand|danger|success|warning|info|secondary|gray|focus-ring|border-strong|primary-fg|primary-active)[a-z0-9-]*'
	].join('|'),
	'g'
);

/**
 * @param {string} src file text
 * @param {{ file?: string }} [options] repo-relative path (decides the `ui/` alpha rule)
 * @returns {{ out: string, count: number, unmapped: Array<{ line: number, text: string }> }}
 */
export function transformSource(src, { file = '' } = {}) {
	const inUi = file.replaceAll('\\', '/').startsWith('src/lib/components/ui/');
	let count = 0;

	let out = src.replace(UTILITY, (whole, prefix, name) => {
		const sem = semanticFor(name, prefix);
		if (!sem) return whole;
		count++;
		return `${prefix}-${sem}${statusEdge(name, prefix, inUi)}`;
	});

	out = out.replace(CUSTOM_PROPERTY, (whole, name) => {
		if (SAME_NAME.has(name)) {
			count++;
			return `--${name}`;
		}
		// the brand ramp is the primary ramp under another name: the step carries over
		const brand = /^brand-(\d+)$/.exec(name);
		if (brand) {
			count++;
			return `--primary-${brand[1]}`;
		}
		const sem = semanticFor(name, '');
		if (!sem) return whole;
		count++;
		return `--${sem}`;
	});

	/** @type {Array<{ line: number, text: string }>} */
	const unmapped = [];
	const lines = out.split('\n');
	lines.forEach((line, i) => {
		for (const m of line.matchAll(LEFTOVER)) unmapped.push({ line: i + 1, text: m[0] });
	});
	return { out, count, unmapped };
}

// ── CLI ────────────────────────────────────────────────────────────────────

function main() {
	const dry = process.argv.includes('--dry');
	const files = ['svelte', 'ts', 'css', 'html']
		.flatMap((ext) => globSync(`src/**/*.${ext}`, { cwd: ROOT }))
		.map((f) => f.replaceAll('\\', '/'))
		.filter((f) => !EXCLUDED.some((e) => f.startsWith(e)))
		.sort();
	let total = 0;
	let changed = 0;
	const unmappedAll = [];
	for (const file of files) {
		const abs = join(ROOT, file);
		const before = readFileSync(abs, 'utf8');
		const { out, count, unmapped } = transformSource(before, { file });
		for (const u of unmapped) unmappedAll.push(`${file}:${u.line}  ${u.text}`);
		if (count === 0) continue;
		total += count;
		changed++;
		console.log(`${file}: ${count} replacements`);
		if (!dry && out !== before) writeFileSync(abs, out);
	}
	console.log(`\n${dry ? '(dry run) ' : ''}${total} replacements in ${changed} file(s).`);
	if (unmappedAll.length) {
		console.log(`\n${unmappedAll.length} legacy occurrence(s) NOT mapped (fix by hand):`);
		for (const u of unmappedAll) console.log(`  ${u}`);
	} else {
		console.log('\nNo unmapped legacy occurrences.');
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
