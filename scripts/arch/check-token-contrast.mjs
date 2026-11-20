#!/usr/bin/env node
/**
 * Token contrast gate.
 *
 * Resolves the semantic tokens in src/styles/theme/{palettes,semantic}.css for EVERY combination
 * of colours (8) x mode (light, dark) x dark palette (5) x sidebar colours (5) = 400, and checks
 * WCAG 2.2 AA contrast on the pairs the UI promises: 4.5:1 for text, 3:1 for UI boundaries and
 * focus rings.
 *
 * The resolver mirrors what the browser does, on the flat rules those two files are restricted to:
 *   - a rule is `:root` or `:root[data-x='y']...`; anything else fails the gate
 *   - a rule applies when every attribute condition holds for the combination; higher attribute
 *     count wins, then source order (CSS specificity)
 *   - var(), light-dark(a, b) and color-mix(in <space>, ...) are resolved
 *   - `transparent`, and a mix toward `transparent`, is ALPHA-COMPOSITED in sRGB over the backdrop of
 *     the pair being checked (pair.over, default --card), the way the browser paints it
 *   - a pair may carry `alpha` (+ `alphaOn`, `over`): the colour on that side is painted at that
 *     opacity over the backdrop. The regenerated shadcn files must not use such modifiers on
 *     contrast-bearing colours (check-tokens.mjs), so this exists to keep the gate honest and
 *     to prove what the opaque tokens replace.
 *   - a pair that resolves to a missing variable is a failure, never a skip
 *
 * Exit code: 0 on clean, 1 on any sub-threshold pair or a file the resolver cannot read.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampRgb, converter, interpolate, parse, wcagContrast } from 'culori';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const FILES = ['src/styles/theme/palettes.css', 'src/styles/theme/semantic.css'];

export const AXES = {
	colors: ['leadkart', 'green', 'violet', 'orange', 'teal', 'fuchsia', 'lime', 'amber'],
	mode: ['light', 'dark'],
	darkPalette: ['default', 'zinc', 'stone', 'neutral', 'gray'],
	sidebarColors: ['light', 'dark', 'brand', 'purple', 'sky']
};
const ATTRIBUTE_FOR = {
	colors: 'data-colors',
	mode: 'data-mode',
	darkPalette: 'data-dark-palette',
	sidebarColors: 'data-sidebar-colors'
};

const TEXT = 4.5;
const UI = 3;
const STATUS = ['success', 'warning', 'info'];
const SURFACES = ['background', 'card', 'muted'];

/**
 * @typedef {{ fg: string, bg: string, min: number, label: string, alpha?: number,
 *   alphaOn?: 'fg' | 'bg', over?: string }} Pair
 * `over` names the token transparent colours and alpha are composited onto (default `card`).
 */
/** [foreground, background, minimum ratio, options] */
const RAW_PAIRS = [
	// text on the surfaces
	...SURFACES.map((s) => ['foreground', s, TEXT]),
	...SURFACES.map((s) => ['muted-foreground', s, TEXT]),
	// primary: as a fill and as text/links on every surface it is used on
	['primary-foreground', 'primary', TEXT],
	['primary-foreground', 'primary-hover', TEXT],
	...SURFACES.map((s) => ['primary', s, TEXT]),
	['primary', 'primary-soft', TEXT],
	// LEGACY: text-brand-600 on bg-brand-50 (Combobox, DatePicker, DateRangePicker) until Task 7
	['brand-600', 'primary-50', TEXT, { legacy: true }],
	['secondary-foreground', 'secondary', TEXT],
	['destructive-foreground', 'destructive', TEXT],
	['destructive-foreground', 'destructive-hover', TEXT],
	...STATUS.map((s) => [`${s}-foreground`, s, TEXT]),
	['destructive', 'destructive-soft', TEXT],
	...STATUS.map((s) => [s, `${s}-soft`, TEXT]),
	// form fields: text on the (opaque in dark) input fill, over each surface the field sits on
	['foreground', 'input-fill', TEXT, { over: 'card' }],
	['muted-foreground', 'input-fill', TEXT, { over: 'card' }],
	['foreground', 'input-fill', TEXT, { over: 'muted' }],
	['muted-foreground', 'input-fill', TEXT, { over: 'muted' }],
	// non-text indicators: focus ring, form-control border (WCAG 1.4.11)
	...[...SURFACES, 'popover'].map((s) => ['ring', s, UI]),
	...SURFACES.map((s) => ['input', s, UI]),
	// sidebar
	['sidebar-foreground', 'sidebar', TEXT],
	['sidebar-muted-foreground', 'sidebar', TEXT],
	['sidebar-accent-foreground', 'sidebar', TEXT],
	// the active-link tint is `color-mix(accent-fg 10%, transparent)`: composited over the sidebar
	['sidebar-accent-foreground', 'sidebar-accent', TEXT, { over: 'sidebar' }],
	['sidebar-primary-foreground', 'sidebar-primary', TEXT],
	['sidebar-ring', 'sidebar', UI]
];

/** @type {Pair[]} */
export const PAIRS = RAW_PAIRS.map(([fg, bg, min, opts = {}]) => ({
	fg,
	bg,
	min,
	...opts,
	label: `${fg} on ${bg}${opts.over && opts.over !== 'card' ? ` (over ${opts.over})` : ''}${opts.alpha ? ` @${opts.alpha}` : ''}`
}));

const toRgb = converter('rgb');

// ── parsing ────────────────────────────────────────────────────────────────

const SELECTOR = /^:root((?:\[data-[a-z-]+=(?:'[^']*'|"[^"]*")\])*)$/;
const CONDITION = /\[(data-[a-z-]+)=(?:'([^']*)'|"([^"]*)")\]/g;

/** @returns {{ rules: Array<{ conditions: Record<string,string>, decls: Array<[string,string]>, order: number }>, errors: string[] }} */
export function parseRules(css, file) {
	const errors = [];
	const rules = [];
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
	let order = 0;
	for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = m[1].trim();
		const sm = SELECTOR.exec(selector);
		if (!sm) {
			errors.push(`${file}: selector "${selector}" is not :root or :root[data-x='y']`);
			continue;
		}
		const conditions = {};
		for (const c of sm[1].matchAll(CONDITION)) conditions[c[1]] = c[2] ?? c[3];
		const decls = [];
		for (const d of m[2].split(';')) {
			const i = d.indexOf(':');
			if (i < 0) continue;
			const name = d.slice(0, i).trim();
			if (name.startsWith('--')) decls.push([name, d.slice(i + 1).trim()]);
		}
		rules.push({ conditions, decls, order: order++ });
	}
	return { rules, errors };
}

/** The custom properties in force for one combination, as CSS specificity would order them. */
export function propertiesFor(rules, combo) {
	const attrs = {};
	for (const [axis, value] of Object.entries(combo)) attrs[ATTRIBUTE_FOR[axis]] = value;
	const applicable = rules
		.filter((r) => Object.entries(r.conditions).every(([k, v]) => attrs[k] === v))
		.sort(
			(a, b) =>
				Object.keys(a.conditions).length - Object.keys(b.conditions).length || a.order - b.order
		);
	const props = new Map();
	for (const r of applicable) for (const [n, v] of r.decls) props.set(n, v);
	return props;
}

// ── value resolution ───────────────────────────────────────────────────────

/** Index of the `)` matching the `(` at `open`. */
function closing(str, open) {
	let depth = 0;
	for (let i = open; i < str.length; i++) {
		if (str[i] === '(') depth++;
		else if (str[i] === ')' && --depth === 0) return i;
	}
	throw new Error(`unbalanced parentheses in "${str}"`);
}

function splitTop(str) {
	const parts = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < str.length; i++) {
		if (str[i] === '(') depth++;
		else if (str[i] === ')') depth--;
		else if (str[i] === ',' && depth === 0) {
			parts.push(str.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(str.slice(start).trim());
	return parts;
}

function substituteVars(value, props, depth = 0) {
	if (depth > 40) throw new Error(`var() chain too deep: ${value}`);
	let out = value;
	for (let i = out.indexOf('var('); i >= 0; i = out.indexOf('var(')) {
		const end = closing(out, i + 3);
		const [name, ...fallback] = splitTop(out.slice(i + 4, end));
		const found = props.get(name);
		const replacement =
			found !== undefined
				? substituteVars(found, props, depth + 1)
				: fallback.length
					? substituteVars(fallback.join(','), props, depth + 1)
					: null;
		if (replacement === null) throw new Error(`${name} is not defined`);
		out = out.slice(0, i) + replacement + out.slice(end + 1);
	}
	return out;
}

function pickLightDark(value, mode) {
	let out = value;
	for (let i = out.indexOf('light-dark('); i >= 0; i = out.indexOf('light-dark(')) {
		const end = closing(out, i + 10);
		const [light, dark] = splitTop(out.slice(i + 11, end));
		out = out.slice(0, i) + (mode === 'dark' ? dark : light) + out.slice(end + 1);
	}
	return out;
}

/** `fg` painted at `alpha` over `bg`, composited in sRGB (what the browser does). */
export function composite(fg, alpha, bg) {
	const f = toRgb(fg);
	const b = toRgb(bg);
	return {
		mode: 'rgb',
		r: f.r * alpha + b.r * (1 - alpha),
		g: f.g * alpha + b.g * (1 - alpha),
		b: f.b * alpha + b.b * (1 - alpha)
	};
}

/** culori colour for a fully substituted value. `over` is what `transparent` composites onto. */
function toColor(value, over) {
	const v = value.trim();
	if (v.startsWith('color-mix(')) {
		const [space, ...stops] = splitTop(v.slice(10, closing(v, 9)));
		const spaceName = space.replace(/^in\s+/, '').trim();
		const parsed = stops.map((s) => {
			const pm = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(s) ?? /^(\d+(?:\.\d+)?)%\s+(.*)$/.exec(s);
			if (!pm) return { color: s, pct: null };
			return /%$/.test(s)
				? { color: pm[1], pct: Number(pm[2]) }
				: { color: pm[2], pct: Number(pm[1]) };
		});
		if (parsed.length !== 2) throw new Error(`color-mix needs two colours: ${v}`);
		const [a, b] = parsed;
		const pa = a.pct ?? (b.pct === null ? 50 : 100 - b.pct);
		const pb = b.pct ?? 100 - pa;
		const aClear = a.color.trim() === 'transparent';
		const bClear = b.color.trim() === 'transparent';
		// A mix toward `transparent` is the colour at that share as ALPHA, painted over the backdrop.
		if (bClear) return composite(toColor(a.color, over), pa / 100, over);
		if (aClear) return composite(toColor(b.color, over), pb / 100, over);
		const mode = spaceName === 'srgb' ? 'rgb' : spaceName;
		return interpolate([toColor(b.color, over), toColor(a.color, over)], mode)(pa / 100);
	}
	if (v === 'transparent') return over;
	const c = parse(v);
	if (!c) throw new Error(`cannot parse colour "${v}"`);
	return c;
}

/** One token, resolved for a combination. `over` is the backdrop transparent parts land on. */
export function resolveColor(name, props, mode, over = { mode: 'rgb', r: 1, g: 1, b: 1 }) {
	const raw = props.get(`--${name}`);
	if (raw === undefined) throw new Error(`--${name} is not defined`);
	return toColor(pickLightDark(substituteVars(raw, props), mode), over);
}

function ratio(a, b) {
	return wcagContrast(clampRgb(toRgb(a)), clampRgb(toRgb(b)));
}

/** The contrast of one pair for one combination's properties. */
export function pairRatio(pair, props, mode) {
	const over = resolveColor(pair.over ?? 'card', props, mode);
	let fg = resolveColor(pair.fg, props, mode, over);
	let bg = resolveColor(pair.bg, props, mode, over);
	if (pair.alpha !== undefined) {
		if (pair.alphaOn === 'bg') bg = composite(bg, pair.alpha, over);
		else fg = composite(fg, pair.alpha, bg);
	}
	return ratio(fg, bg);
}

// ── gate ───────────────────────────────────────────────────────────────────

/**
 * @param {Array<[string, string]>} files [name, css]
 * @param {{ pairs?: Pair[], axes?: typeof AXES }} [options]
 */
export function checkCss(files, { pairs = PAIRS, axes = AXES } = {}) {
	const problems = [];
	let all = [];
	for (const [file, css] of files) {
		const { rules, errors } = parseRules(css, file);
		problems.push(...errors);
		all = all.concat(rules.map((r, i) => ({ ...r, order: all.length + i })));
	}
	if (problems.length) return { problems, combinations: 0, checked: 0, pairs: pairs.length };

	let combinations = 0;
	let checked = 0;
	for (const colors of axes.colors)
		for (const mode of axes.mode)
			for (const darkPalette of axes.darkPalette)
				for (const sidebarColors of axes.sidebarColors) {
					combinations++;
					const combo = { colors, mode, darkPalette, sidebarColors };
					const props = propertiesFor(all, combo);
					const label = `${colors}/${mode}/${darkPalette}/${sidebarColors}`;
					for (const pair of pairs) {
						try {
							const r = pairRatio(pair, props, mode);
							checked++;
							if (r < pair.min)
								problems.push(`${label} · ${pair.label} · ${r.toFixed(2)} < ${pair.min}`);
						} catch (e) {
							problems.push(`${label} · ${pair.label} · ${e.message}`);
						}
					}
				}
	// never pass vacuously
	if (pairs.length === 0 || combinations === 0)
		problems.push('no pairs or no combinations checked');
	return { problems, combinations, checked, pairs: pairs.length };
}

export function check() {
	const files = [];
	const problems = [];
	for (const file of FILES) {
		const path = join(ROOT, file);
		if (!existsSync(path)) problems.push(`${file} not found`);
		else files.push([file, readFileSync(path, 'utf8')]);
	}
	if (problems.length) return { problems, combinations: 0, checked: 0, pairs: 0 };
	return checkCss(files);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const { problems, combinations, checked, pairs } = check();
	if (problems.length === 0) {
		console.log(
			`✓ check-token-contrast: ${pairs} pair(s) x ${combinations} combination(s) = ${checked} check(s) meet WCAG AA.`
		);
		process.exit(0);
	}
	if (problems.length === 1 && problems[0].endsWith('not found')) {
		console.error(`✗ check-token-contrast: ${problems[0]}`);
		process.exit(1);
	}
	// One line per failing pair (worst ratio, how many combinations); --all lists every combination.
	if (process.argv.includes('--all')) {
		console.error(`✗ check-token-contrast: ${problems.length} failure(s):
`);
		for (const p of problems) console.error(`  ${p}`);
		process.exit(1);
	}
	const byPair = new Map();
	for (const p of problems) {
		const [combination, pair, ratio] = p.split(' · ');
		const entry = byPair.get(pair) ?? { count: 0, worst: p, worstRatio: Infinity };
		entry.count++;
		const r = Number.parseFloat(ratio);
		if (!(r >= entry.worstRatio)) {
			entry.worst = `${combination} · ${pair} · ${ratio}`;
			entry.worstRatio = Number.isNaN(r) ? -1 : r;
		}
		byPair.set(pair, entry);
	}
	console.error(
		`✗ check-token-contrast: ${problems.length} failure(s) in ${byPair.size} pair(s):\n`
	);
	for (const [, e] of byPair) console.error(`  ${e.worst}   (${e.count} combination(s))`);
	console.error('\nRun with --all to list every failing combination.');
	process.exit(1);
}
