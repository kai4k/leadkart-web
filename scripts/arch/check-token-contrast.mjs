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
 *   - var(), light-dark(a, b) and color-mix(in <space>, ...) are resolved; `transparent` in a mix
 *     is composited over --card
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

/** [foreground, background, minimum ratio, label] */
export const PAIRS = [
	['foreground', 'background', TEXT],
	['foreground', 'card', TEXT],
	['muted-foreground', 'background', TEXT],
	['muted-foreground', 'card', TEXT],
	['muted-foreground', 'muted', TEXT],
	['primary-foreground', 'primary', TEXT],
	['secondary-foreground', 'secondary', TEXT],
	['destructive-foreground', 'destructive', TEXT],
	...STATUS.map((s) => [`${s}-foreground`, s, TEXT]),
	['destructive', 'destructive-soft', TEXT],
	...STATUS.map((s) => [s, `${s}-soft`, TEXT]),
	['primary', 'card', TEXT],
	['ring', 'background', UI],
	['ring', 'card', UI],
	['input', 'card', UI],
	['sidebar-foreground', 'sidebar', TEXT],
	['sidebar-accent-foreground', 'sidebar', TEXT],
	['sidebar-primary-foreground', 'sidebar-primary', TEXT]
].map(([fg, bg, min]) => ({ fg, bg, min, label: `${fg} on ${bg}` }));

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
		const [first, b] = parsed;
		let a = first;
		if (a.pct === null && b.pct === null) a = { ...a, pct: 50 };
		const pa = a.pct ?? 100 - b.pct;
		const mode = spaceName === 'srgb' ? 'rgb' : spaceName;
		const ca = toColor(a.color, over);
		const transparentB = b.color.trim() === 'transparent';
		const cb = transparentB ? over : toColor(b.color, over);
		// Mixing toward `transparent` is the colour at pa% alpha over the surface.
		const mixed = interpolate([cb, ca], mode)(pa / 100);
		return mixed;
	}
	if (v === 'transparent') return over;
	const c = parse(v);
	if (!c) throw new Error(`cannot parse colour "${v}"`);
	return c;
}

export function resolveColor(name, props, mode) {
	const raw = props.get(`--${name}`);
	if (raw === undefined) throw new Error(`--${name} is not defined`);
	const flat = pickLightDark(substituteVars(raw, props), mode);
	const card = props.get('--card');
	const over =
		card && name !== 'card' ? resolveColor('card', props, mode) : { mode: 'rgb', r: 1, g: 1, b: 1 };
	return toColor(flat, over);
}

function ratio(a, b) {
	return wcagContrast(clampRgb(toRgb(a)), clampRgb(toRgb(b)));
}

// ── gate ───────────────────────────────────────────────────────────────────

export function check() {
	const problems = [];
	let all = [];
	for (const file of FILES) {
		const path = join(ROOT, file);
		if (!existsSync(path)) {
			problems.push(`${file} not found`);
			continue;
		}
		const { rules, errors } = parseRules(readFileSync(path, 'utf8'), file);
		problems.push(...errors);
		all = all.concat(rules.map((r, i) => ({ ...r, order: all.length + i })));
	}
	if (problems.length) return { problems, combinations: 0, checked: 0 };

	let combinations = 0;
	let checked = 0;
	for (const colors of AXES.colors)
		for (const mode of AXES.mode)
			for (const darkPalette of AXES.darkPalette)
				for (const sidebarColors of AXES.sidebarColors) {
					combinations++;
					const combo = { colors, mode, darkPalette, sidebarColors };
					const props = propertiesFor(all, combo);
					const label = `${colors}/${mode}/${darkPalette}/${sidebarColors}`;
					for (const { fg, bg, min, label: pair } of PAIRS) {
						try {
							const r = ratio(resolveColor(fg, props, mode), resolveColor(bg, props, mode));
							checked++;
							if (r < min) problems.push(`${label} · ${pair} · ${r.toFixed(2)} < ${min}`);
						} catch (e) {
							problems.push(`${label} · ${pair} · ${e.message}`);
						}
					}
				}
	return { problems, combinations, checked };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const { problems, combinations, checked } = check();
	if (problems.length === 0) {
		console.log(
			`✓ check-token-contrast: ${combinations} combination(s), ${checked} pair check(s) meet WCAG AA.`
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
