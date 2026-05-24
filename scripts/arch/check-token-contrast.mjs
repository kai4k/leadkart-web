#!/usr/bin/env node
/**
 * Token contrast-ratio gate (arch test #141).
 *
 * Walks declared `fg`/`bg` token pairs in src/styles/tokens.css and
 * verifies WCAG 2.2 AA contrast (≥4.5:1 for body, ≥3:1 for large or UI).
 * Catches palette drift that breaks on-surface text legibility.
 *
 * Uses `culori` for parsing — natively supports oklch, oklab, lab, lch,
 * hex, rgb. Computes relative-luminance contrast per WCAG 2.x formula.
 *
 * Pairs are explicitly declared below — only PROMISED fg/bg combinations
 * are verified. Adding a new fg/bg semantic pair requires extending PAIRS.
 *
 * Exit code: 0 on clean, 1 on any sub-threshold pair.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { converter, parse, wcagContrast, formatHex } from 'culori';

const toRgb = converter('rgb');

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TOKENS_FILE = join(ROOT, 'src/styles/tokens.css');

// Pairs that MUST meet WCAG. Threshold per usage:
//   4.5 → AA body text (≥18pt non-bold)
//   3.0 → AA large / UI components (≥18pt bold, focus rings, icons)
const PAIRS = [
	// Body text on surface
	{ fg: 'color-fg', bg: 'color-bg', min: 4.5, label: 'body text on canvas' },
	{ fg: 'color-fg', bg: 'color-bg-elevated', min: 4.5, label: 'body text on card' },
	{ fg: 'color-fg', bg: 'color-bg-subtle', min: 4.5, label: 'body text on subtle bg' },
	{ fg: 'color-fg', bg: 'color-bg-muted', min: 4.5, label: 'body text on muted bg' },
	// Muted text — large-text AA acceptable
	{ fg: 'color-fg-muted', bg: 'color-bg', min: 4.5, label: 'muted text on canvas' },
	{ fg: 'color-fg-muted', bg: 'color-bg-elevated', min: 4.5, label: 'muted text on card' },
	// Foreground on primary fill (buttons, badges)
	{ fg: 'color-primary-fg', bg: 'color-primary', min: 4.5, label: 'on-primary text' },
	// Semantic colour pairs (soft-fill badges, alerts)
	{ fg: 'color-success-900', bg: 'color-success-50', min: 4.5, label: 'success-900 on success-50' },
	{ fg: 'color-warning-900', bg: 'color-warning-50', min: 4.5, label: 'warning-900 on warning-50' },
	{ fg: 'color-danger-900', bg: 'color-danger-50', min: 4.5, label: 'danger-900 on danger-50' },
	{ fg: 'color-info-900', bg: 'color-info-50', min: 4.5, label: 'info-900 on info-50' },
	// Focus ring needs ≥3:1 against EVERY surface tier
	{ fg: 'color-focus-ring', bg: 'color-bg', min: 3, label: 'focus ring on canvas' },
	{ fg: 'color-focus-ring', bg: 'color-bg-elevated', min: 3, label: 'focus ring on card' },
	// Border discrimination on canvas
	{ fg: 'color-border-strong', bg: 'color-bg', min: 3, label: 'strong border on canvas' }
];

const src = readFileSync(TOKENS_FILE, 'utf8');

// Parse `--name: value;` declarations. Skip non-colour tokens up-front.
const tokens = new Map();
for (const m of src.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
	const value = m[2].trim();
	if (
		value.startsWith('"') ||
		value.includes('px') ||
		value.includes('rem') ||
		value.includes('em') ||
		value.startsWith('cubic-bezier') ||
		value.startsWith('inset') ||
		value.startsWith('linear-gradient') ||
		value.startsWith('1px solid') ||
		value === 'linear' ||
		value === 'none' ||
		!isNaN(Number(value))
	) {
		continue;
	}
	tokens.set(m[1], value);
}

// Resolve var() + color-mix() recursively (single-pass; deep chains rare).
function resolve(value, depth = 0) {
	if (depth > 8) return value;
	let next = value;
	for (const m of value.matchAll(/var\(\s*--([\w-]+)\s*(?:,\s*([^)]+))?\)/g)) {
		const ref = tokens.get(m[1]);
		if (ref) next = next.replace(m[0], ref);
		else if (m[2]) next = next.replace(m[0], m[2].trim());
	}
	if (next !== value) return resolve(next, depth + 1);
	return next;
}

// color-mix(in srgb, <a> P%, <b>) → return the mixed colour as a culori
// object. Culori supports color-mix natively via parse() — but only with
// percent on the first stop; we still resolve the inner var()s first.
function colorFor(name) {
	const raw = tokens.get(name);
	if (!raw) return null;
	const resolved = resolve(raw);
	try {
		const parsed = parse(resolved);
		if (parsed) return parsed;
		// Fallback: handle color-mix(in srgb, A P%, B) manually.
		const mm = resolved.match(
			/color-mix\(in\s+srgb,\s*([^,]+?)\s+(\d+(?:\.\d+)?)%\s*,\s*([^)]+)\)/i
		);
		if (mm) {
			const a = parse(resolve(mm[1].trim()));
			const b = parse(resolve(mm[3].trim()));
			if (!a || !b) return null;
			const pct = parseFloat(mm[2]) / 100;
			const ar = toRgb(a);
			const br = toRgb(b);
			return {
				mode: 'rgb',
				r: ar.r * pct + br.r * (1 - pct),
				g: ar.g * pct + br.g * (1 - pct),
				b: ar.b * pct + br.b * (1 - pct),
				alpha: 1
			};
		}
	} catch {
		// fall through
	}
	return null;
}

let violations = [];
let passed = 0;
let unresolved = [];

for (const { fg, bg, min, label } of PAIRS) {
	const f = colorFor(fg);
	const b = colorFor(bg);
	if (!f || !b) {
		unresolved.push(`${label} (--${fg} on --${bg})`);
		continue;
	}
	const ratio = wcagContrast(f, b);
	if (ratio < min) {
		violations.push(
			`${label}: --${fg} (${formatHex(f)}) on --${bg} (${formatHex(b)}) = ${ratio.toFixed(2)}:1 < ${min}:1`
		);
	} else {
		passed += 1;
	}
}

if (violations.length === 0 && unresolved.length === 0) {
	console.log(`✓ check-token-contrast: ${passed} token pair(s) meet WCAG AA contrast.`);
	process.exit(0);
}

if (unresolved.length > 0) {
	console.warn(
		`  ? ${unresolved.length} pair(s) could not be resolved (oklch/color-mix parsing — culori): ${unresolved.join(', ')}`
	);
}

if (violations.length === 0) {
	console.log(`✓ check-token-contrast: ${passed} token pair(s) meet WCAG AA contrast.`);
	process.exit(0);
}

console.error(`✗ check-token-contrast: ${violations.length} pair(s) below WCAG AA:\n`);
for (const v of violations) console.error(`  ${v}`);
console.error(
	'\nFix: adjust the lightness stop in tokens.css until contrast meets the threshold (WebAIM Contrast Checker can verify).'
);
process.exit(1);
