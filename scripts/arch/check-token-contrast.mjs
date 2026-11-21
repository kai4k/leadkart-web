#!/usr/bin/env node
/**
 * Token contrast gate.
 *
 * Resolves the semantic tokens in src/styles/theme/{palettes,semantic}.css for EVERY combination
 * of colours (8) x mode (light, dark) x dark palette (5) x sidebar colours (5) = 400, plus
 * black-white (a light mode through a grayscale filter; one dark palette, it does not use them)
 * x colours x sidebar colours = 40, and checks
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
import { corners, paint } from './lib/material-bound.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const INDEX_CSS = 'src/styles/index.css';

/**
 * Every theme file, in the order the barrel imports them (source order is part of the cascade the
 * resolver reproduces). Reading the barrel, not a fixed list, means a new `theme/*.css` file is
 * covered by construction.
 */
export function themeFiles(root = ROOT) {
	const barrel = readFileSync(join(root, INDEX_CSS), 'utf8');
	return [...barrel.matchAll(/@import\s+'\.\/(theme\/[\w.-]+\.css)'/g)]
		.map((m) => `src/styles/${m[1]}`)
		.filter((p) => !UNGATED_THEME_FILES.includes(p));
}

/**
 * Theme files that are NOT read: they declare no token of their own, they only repeat the gated `off`
 * values inside @media / @supports (tests/unit/styles/materials.test.ts compares them). Pinned by name.
 */
export const UNGATED_THEME_FILES = ['src/styles/theme/materials-fallbacks.css'];

/** The pattern topbar re-declares tokens on the topbar (layouts.css); its pairs resolve inside that scope. */
export const PATTERN_TOPBAR = {
	selector: "[data-shell='topbar']",
	attrs: { 'data-nav-type': 'pattern' }
};

export const AXES = {
	colors: ['leadkart', 'green', 'violet', 'orange', 'teal', 'fuchsia', 'lime', 'amber'],
	// `auto` is light or dark by the OS, so it is covered by those two; `black-white` is a light
	// mode painted through `filter: grayscale(1)` on <html>, measured on the grayscale (pairRatio)
	mode: ['light', 'dark', 'black-white'],
	darkPalette: ['default', 'zinc', 'stone', 'neutral', 'gray'],
	sidebarColors: ['light', 'dark', 'brand', 'purple', 'sky'],
	// the Transparency preference: `glass` is the default (no attribute rule), `reduced` and `off` re-declare
	// the material fills in materials.css
	transparency: ['glass', 'reduced', 'off']
};
const ATTRIBUTE_FOR = {
	colors: 'data-colors',
	mode: 'data-mode',
	darkPalette: 'data-dark-palette',
	sidebarColors: 'data-sidebar-colors',
	transparency: 'data-transparency'
};

const TEXT = 4.5;
const UI = 3;
/**
 * The logo (GD21). A logo is a logotype: WCAG 1.4.11 exempts it, but an invisible logo is still a defect, so it
 * has its own floors. The FRAME (the L-cart, the part that identifies the mark) meets 3:1 on every surface it
 * sits on (UI). The CAPSULE is an accent inside the logo: LOGO_CAPSULE on the surface, and LOGO_TWO_TONE against
 * the frame, so the mark reads as two tones. Only where a logo is drawn: a card (RouteError), primary-soft (the
 * auth mobile row), the sidebar layers, the topbar layer, and the pattern band.
 */
const LOGO_CAPSULE = 1.6;
const LOGO_TWO_TONE = 1.5;
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
	// primary by role (plan G1): the label on its fill; text in the primary colour on every surface it
	// sits on; the non-text marks and the glyph on them
	['primary-foreground', 'primary', TEXT],
	['primary-foreground', 'primary-hover', TEXT],
	...[...SURFACES, 'popover', 'primary-soft', 'row-hover'].map((s) => ['primary-text', s, TEXT]),
	...[...SURFACES, 'popover'].map((s) => ['primary-indicator', s, UI]),
	['primary-indicator-foreground', 'primary-indicator', UI, { note: 'check glyph' }],
	['background', 'primary-indicator', UI, { note: 'switch thumb on the track' }],
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
	// field error text (Field.Error) and the invalid border (WCAG 1.4.3 / 1.4.11), on every surface a
	// field can sit on (muted included: destructive 600 was 3.84:1 there, so light destructive is 700)
	...[...SURFACES, 'popover'].map((s) => ['destructive', s, TEXT]),
	// floating surfaces (select, combobox, calendar popups) and their highlighted / today / range cells
	['popover-foreground', 'popover', TEXT],
	['muted-foreground', 'popover', TEXT],
	['accent-foreground', 'accent', TEXT],
	['muted-foreground', 'accent', TEXT],
	['foreground', 'primary-soft', TEXT],
	['muted-foreground', 'primary-soft', TEXT],
	// switch thumb on its track, both states (WCAG 1.4.11): off track is `input`, on track `primary`
	['background', 'input', UI],
	['primary-foreground', 'primary', UI],
	// non-text indicators: focus ring, form-control border (WCAG 1.4.11)
	...[...SURFACES, 'popover'].map((s) => ['ring', s, UI]),
	...SURFACES.map((s) => ['input', s, UI]),
	// the logo (BrandMark), where it is drawn on an opaque surface: a card (route error) and the auth mobile row
	...['card', 'primary-soft'].flatMap((s) => [
		['brand-frame', s, UI, { note: 'logo frame' }],
		['brand-capsule', s, LOGO_CAPSULE, { note: 'logo accent' }]
	]),
	['brand-capsule', 'brand-frame', LOGO_TWO_TONE, { note: 'logo: two tones' }],
	['brand-capsule-bar', 'brand-frame-bar', LOGO_TWO_TONE, { note: 'logo: two tones on the bar' }],
	// sidebar
	['sidebar-foreground', 'sidebar', TEXT],
	['sidebar-muted-foreground', 'sidebar', TEXT],
	['sidebar-accent-foreground', 'sidebar', TEXT],
	// the active-link tint is `color-mix(accent-fg 10%, transparent)`: composited over the sidebar
	['sidebar-accent-foreground', 'sidebar-accent', TEXT, { over: 'sidebar' }],
	['sidebar-primary-foreground', 'sidebar-primary', TEXT],
	['sidebar-ring', 'sidebar', UI],
	['sidebar-icon', 'sidebar', UI, { note: 'nav icons (accent on the light sidebar)' }],
	['sidebar-brand-frame', 'sidebar', UI, { note: 'logo frame on the sidebar' }],
	['sidebar-brand-capsule', 'sidebar', LOGO_CAPSULE, { note: 'logo accent on the sidebar' }],
	['sidebar-brand-capsule', 'sidebar-brand-frame', LOGO_TWO_TONE, { note: 'logo: two tones' }],
	// fix round A: the indicators and fills the review found ungated. `note` names the use; several
	// of these re-check a value another pair already covers, on purpose, so the use is on record.
	['ring', 'popover', UI, { note: 'highlighted list item bar' }],
	['ring', 'popover', UI, { note: 'today marker' }],
	['ring', 'card', UI, { note: 'selected table row bar' }],
	['input', 'muted', UI, { note: 'active tab border on the tab list' }],
	['background', 'foreground', TEXT, { note: 'tooltip' }],
	['secondary-foreground', 'secondary-hover', TEXT],
	['foreground', 'row-hover', TEXT],
	['muted-foreground', 'row-hover', TEXT],
	// toasts: text and icon on the soft status fills
	...STATUS.map((s) => ['foreground', `${s}-soft`, TEXT, { note: 'toast text' }]),
	['foreground', 'destructive-soft', TEXT, { note: 'toast text' }],
	// Tasks 12-14: the topbar, the context banners and the pages' headers. Most re-check a pair above on
	// purpose, so each use is on record; the pattern topbar's fills are opaque tokens (never a mix with
	// transparent) so they resolve here: `--muted`/`--accent`/`--border` are `primary-hover` on that
	// topbar, its text and focus ring are `primary-foreground`, painted on the `primary` band.
	['foreground', 'warning-soft', TEXT, { note: 'tenant context banner text' }],
	['foreground', 'destructive-soft', TEXT, { note: 'impersonation banner text' }],
	['primary-foreground', 'primary', TEXT, { note: 'pattern topbar: text and icons on the band' }],
	['primary-foreground', 'primary-hover', TEXT, { note: 'pattern topbar: search fill, hover' }],
	['primary-foreground', 'primary', UI, { note: 'pattern topbar: focus ring on the band' }],
	// the same topbar through its OWN scoped re-declarations (layouts.css): what the topbar's
	// `text-foreground`, `text-muted-foreground`, `bg-muted`, `bg-accent` and `ring` resolve to there
	['foreground', 'primary', TEXT, { scope: PATTERN_TOPBAR, note: 'band text' }],
	['muted-foreground', 'primary', TEXT, { scope: PATTERN_TOPBAR, note: 'band muted text' }],
	['foreground', 'muted', TEXT, { scope: PATTERN_TOPBAR, note: 'search fill' }],
	['muted-foreground', 'muted', TEXT, { scope: PATTERN_TOPBAR, note: 'search placeholder' }],
	['accent-foreground', 'accent', TEXT, { scope: PATTERN_TOPBAR, note: 'hover chip' }],
	['ring', 'primary', UI, { scope: PATTERN_TOPBAR, note: 'focus ring' }],
	['brand-frame', 'primary', UI, { scope: PATTERN_TOPBAR, note: 'logo frame on the band' }],
	// the band is one-colour by design (a monochrome logo on a brand fill): the capsule floor against the band
	// holds, the two-tone floor does not apply there (decision GD21, named)
	[
		'brand-capsule',
		'primary',
		LOGO_CAPSULE,
		{ scope: PATTERN_TOPBAR, note: 'logo accent on the band' }
	],
	// the tokens a material bar would leak into the opaque band are re-declared for it (layouts.css)
	[
		'subtle-foreground',
		'primary',
		TEXT,
		{ scope: PATTERN_TOPBAR, note: 'tertiary text on the band' }
	],
	[
		'primary-indicator',
		'primary',
		UI,
		{ scope: PATTERN_TOPBAR, note: 'indicator mark on the band' }
	],
	['foreground', 'input-fill', TEXT, { scope: PATTERN_TOPBAR, note: 'field fill on the band' }],
	// the auth frame, the page header and the section nav (Tasks 13-14): their text/surface pairs, on record
	['foreground', 'background', TEXT, { note: 'auth frame, page title' }],
	['primary-text', 'card', TEXT, { note: 'auth brand headline' }],
	['muted-foreground', 'card', TEXT, { note: 'auth brand tagline, route error status' }],
	['primary-text', 'primary-soft', TEXT, { note: 'auth mobile brand row, feature icons' }],
	[
		'muted-foreground',
		'background',
		TEXT,
		{ note: 'breadcrumbs, description, inactive section tab' }
	],
	['foreground', 'card', TEXT, { note: 'current section tab' }],
	['foreground', 'muted', TEXT, { note: 'section tab on hover' }],
	['destructive', 'destructive-soft', TEXT, { note: 'route error alert' }],
	// fix round D: the page's colour wash (base.css body) at the peak of each of its three gradients; the page title,
	// breadcrumb, description and links sit directly on it
	...['page-wash-start', 'page-wash-end', 'page-wash-top'].flatMap((w) =>
		['foreground', 'muted-foreground', 'subtle-foreground', 'primary-text'].map((fg) => [
			fg,
			w,
			TEXT,
			{ over: 'background', note: 'page text on the colour wash at its peak' }
		])
	),
	// fix round B: the third text level, the status text on the surfaces it sits on, the indicator
	// (non-text) tokens, and the toast description on each soft fill
	...[...SURFACES, 'popover'].map((s) => ['subtle-foreground', s, TEXT, { note: 'tertiary text' }]),
	['subtle-foreground', 'primary-soft', TEXT, { note: 'tertiary text' }],
	['subtle-foreground', 'row-hover', TEXT, { note: 'tertiary text in a hovered row' }],
	...STATUS.flatMap((s) => SURFACES.map((b) => [s, b, TEXT, { note: 'status text' }])),
	...[...STATUS, 'destructive'].map((s) => [
		'muted-foreground',
		`${s}-soft`,
		TEXT,
		{ note: 'toast description' }
	]),
	...[...STATUS, 'destructive'].flatMap((s) =>
		SURFACES.map((b) => [`${s}-indicator`, b, UI, { note: 'dot, bar or icon mark' }])
	)
];

/** @type {Pair[]} */
export const PAIRS = RAW_PAIRS.map(([fg, bg, min, opts = {}]) => ({
	fg,
	bg,
	min,
	...opts,
	label: `${fg} on ${bg}${opts.scope ? ' (pattern topbar scope)' : ''}${opts.over && opts.over !== 'card' ? ` (over ${opts.over})` : ''}${opts.alpha ? ` @${opts.alpha}` : ''}${opts.note ? ` [${opts.note}]` : ''}`
}));

const toRgb = converter('rgb');

// ── parsing ────────────────────────────────────────────────────────────────

const SELECTOR = /^:root((?:\[data-[a-z-]+=(?:'[^']*'|"[^"]*")\])*)$/;
const CONDITION = /\[(data-[a-z-]+)=(?:'([^']*)'|"([^"]*)")\]/g;

const SCOPED_SELECTOR =
	/^:root((?:\[data-[a-z-]+=(?:'[^']*'|"[^"]*")\])*)(?::not\([^)]*\))*\s+(\[data-[a-z-]+=(?:'[^']*'|"[^"]*")\])$/;

/**
 * @param {{ lenient?: boolean }} [options] `lenient` (layouts.css): a selector that is neither flat nor
 *   a scoped re-declaration (`:root[...] [data-shell='x']`) is skipped instead of failing the gate.
 * @returns {{ rules: Array<{ conditions: Record<string,string>, decls: Array<[string,string]>, order: number, scope?: string }>, errors: string[] }}
 */
export function parseRules(css, file, { lenient = false } = {}) {
	const errors = [];
	const rules = [];
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
	let order = 0;
	for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = m[1].trim();
		const flat = SELECTOR.exec(selector);
		const scoped = flat ? null : SCOPED_SELECTOR.exec(selector);
		const sm = flat ?? scoped;
		if (!sm && lenient) continue;
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
		rules.push({
			conditions,
			decls,
			order: order++,
			...(scoped ? { scope: scoped[2].replaceAll('"', "'") } : {})
		});
	}
	return { rules, errors };
}

/** The custom properties in force for one combination, as CSS specificity would order them. */
export function propertiesFor(rules, combo, scope) {
	const attrs = {};
	for (const [axis, value] of Object.entries(combo)) attrs[ATTRIBUTE_FOR[axis]] = value;
	if (scope) Object.assign(attrs, scope.attrs);
	// A scoped rule re-declares tokens on a descendant, so inside its scope it beats every root rule.
	const applicable = rules
		.filter((r) => r.scope === undefined || (scope !== undefined && r.scope === scope.selector))
		.filter((r) => Object.entries(r.conditions).every(([k, v]) => attrs[k] === v))
		.sort(
			(a, b) =>
				Number(a.scope !== undefined) - Number(b.scope !== undefined) ||
				Object.keys(a.conditions).length - Object.keys(b.conditions).length ||
				a.order - b.order
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
/** What `filter: grayscale(1)` paints for a colour (Filter Effects: the luma matrix on sRGB values). */
export function grayscale(color) {
	const c = toRgb(color);
	const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
	return { mode: 'rgb', r: y, g: y, b: y };
}

export function pairRatio(pair, props, mode) {
	const over = resolveColor(pair.over ?? 'card', props, mode);
	let fg = resolveColor(pair.fg, props, mode, over);
	let bg = resolveColor(pair.bg, props, mode, over);
	if (pair.alpha !== undefined) {
		if (pair.alphaOn === 'bg') bg = composite(bg, pair.alpha, over);
		else fg = composite(fg, pair.alpha, bg);
	}
	if (mode === 'black-white')
		return ratio(grayscale(clampRgb(toRgb(fg))), grayscale(clampRgb(toRgb(bg))));
	return ratio(fg, bg);
}

// ── materials (plan G3): the legibility bound of translucent surfaces ───────────────────────────

const GLASS_MAX_ALPHA = 0.9;
const BLACK = { mode: 'rgb', r: 0, g: 0, b: 0 };
const WHITE = { mode: 'rgb', r: 1, g: 1, b: 1 };

/**
 * @typedef {{ control: string, text: string[], min?: number }} OnControl
 * @typedef {{ layer: string, fill: string, surface: string, saturate: string, contrast: string,
 *   backdrops: string[], under?: string, text: string[], marks: Array<string | { token: string, min: number }>, onControl?: OnControl[] }} MaterialLayer
 * `surface` is the opaque token the fill is `N%` of (the `--needs` table solves for N).
 * `backdrops` are tokens (resolved for the combination) and the literals '#000' / '#fff': any image,
 * avatar, logo or the auth particles count as black and white. `under` is a token (the scrim)
 * composited over each backdrop first. Text needs 4.5, marks 3.
 */
const BAR_BACKDROPS = [
	'background',
	'card',
	'muted',
	'primary',
	'primary-soft',
	'foreground',
	'destructive-soft',
	'warning-soft',
	'#000',
	'#fff'
];
const FLOAT_BACKDROPS = ['background', 'card', 'muted', 'primary', 'foreground', '#000', '#fff'];
const INPUT_WELL = { control: 'material-input-fill', text: ['foreground'] };
/** What sits on a control fill inside a bar: the search field's text and kbd hint (muted), the hover chip. */
const BAR_CONTROLS = [
	{ control: 'material-control', text: ['foreground', 'material-muted-foreground'] },
	{
		control: 'material-control-hover',
		text: ['foreground', 'accent-foreground', 'material-muted-foreground']
	},
	INPUT_WELL
];
const BAR = {
	fill: 'material-bar-fill',
	surface: 'card',
	saturate: 'material-bar-saturate',
	contrast: 'material-bar-contrast',
	backdrops: BAR_BACKDROPS,
	text: ['foreground', 'material-muted-foreground'],
	marks: ['material-ring', 'material-indicator'],
	onControl: BAR_CONTROLS
};
/** the topbar is the one bar that draws the logo: material-bar re-declares the capsule for it (utilities.css) */
const TOPBAR = {
	...BAR,
	marks: [
		...BAR.marks,
		{ token: 'brand-frame-bar', min: UI },
		{ token: 'brand-capsule-bar', min: LOGO_CAPSULE }
	]
};
/**
 * The horizontal nav (GD17): a bar-recipe filter over the SIDEBAR colour (`material-sidebar-bar`), so its
 * text and marks are the sidebar's, per sidebar colour. The sidebar colour axis is independent of the page mode.
 */
const SIDEBAR_BAR = {
	fill: 'material-sidebar-fill',
	surface: 'sidebar',
	saturate: 'material-bar-saturate',
	contrast: 'material-bar-contrast',
	backdrops: BAR_BACKDROPS,
	text: ['sidebar-foreground', 'sidebar-muted-foreground', 'sidebar-accent-foreground'],
	marks: ['sidebar-ring', 'sidebar-icon'],
	onControl: [
		{ control: 'sidebar-accent', text: ['sidebar-accent-foreground', 'sidebar-foreground'] }
	]
};
const PANE = {
	fill: 'material-pane-fill',
	surface: 'popover',
	saturate: 'material-pane-saturate',
	contrast: 'material-pane-contrast'
};
const SIDEBAR = {
	fill: 'material-sidebar-fill',
	surface: 'sidebar',
	saturate: 'material-pane-saturate',
	contrast: 'material-pane-contrast',
	text: ['sidebar-foreground', 'sidebar-muted-foreground'],
	marks: [
		'sidebar-ring',
		'sidebar-icon',
		{ token: 'sidebar-brand-frame', min: UI },
		{ token: 'sidebar-brand-capsule', min: LOGO_CAPSULE }
	],
	onControl: [
		{
			control: 'sidebar-accent',
			text: ['sidebar-accent-foreground', 'sidebar-foreground', 'sidebar-muted-foreground']
		}
	]
};
const OVERLAY_TEXT = [
	'foreground',
	'material-muted-foreground',
	'destructive',
	'primary-text',
	'success',
	'warning',
	'info'
];
/**
 * Text that sits on the highlighted / hovered control fill of a pane (menu items, list rows, chips).
 * `primary-text` and `destructive` are NOT here: on a control fill they reach 2.8-4.3 (dark destructive, violet
 * primary text) and no component needs them there (a destructive menu item highlights with its own opaque
 * `destructive-soft`). check-tokens rule m6 refuses the class combination in the material families instead.
 */
const PANE_CONTROL_TEXT = ['foreground', 'material-muted-foreground', 'accent-foreground'];
const PANE_CONTROLS = [
	{ control: 'material-control', text: PANE_CONTROL_TEXT },
	{ control: 'material-control-hover', text: PANE_CONTROL_TEXT },
	INPUT_WELL
];

/** Every layer a material is used on (plan 3.2). A material utility with no layer here fails the gate's test. */
/** @type {MaterialLayer[]} */
export const MATERIAL_LAYERS = [
	{ layer: 'topbar', ...TOPBAR },
	{ layer: 'hnav', ...SIDEBAR_BAR },
	{ layer: 'bulk-bar', ...BAR },
	{
		layer: 'sidebar-desktop',
		...SIDEBAR,
		backdrops: ['background', 'primary-100', 'primary-200', 'primary-soft', 'primary-500']
	},
	{ layer: 'sidebar-mobile', ...SIDEBAR, backdrops: ['#000', '#fff'], under: 'scrim' },
	{
		layer: 'overlay',
		...PANE,
		backdrops: ['#000', '#fff'],
		under: 'scrim',
		text: OVERLAY_TEXT,
		marks: ['material-ring', 'input', 'primary-indicator'],
		onControl: PANE_CONTROLS
	},
	{
		layer: 'float',
		...PANE,
		backdrops: FLOAT_BACKDROPS,
		text: OVERLAY_TEXT,
		marks: ['material-ring', 'primary-indicator'],
		onControl: PANE_CONTROLS
	},
	{
		layer: 'auth-card',
		...PANE,
		backdrops: [
			'background',
			'primary-100',
			'primary-200',
			'primary-300',
			'primary-400',
			'primary-500',
			'primary-600',
			'foreground'
		],
		text: ['foreground', 'material-muted-foreground', 'primary-text', 'destructive'],
		marks: ['material-ring', 'input'],
		onControl: PANE_CONTROLS
	}
];

const key = (c) => `${c.r.toFixed(5)},${c.g.toFixed(5)},${c.b.toFixed(5)}`;

/** One combination's resolver: opaque tokens are memoised, a token that mixes toward transparent is not. */
function makeResolver(props, mode) {
	const memo = new Map();
	return (name, over = WHITE) => {
		const raw = props.get(`--${name}`);
		if (raw === undefined) throw new Error(`--${name} is not defined`);
		const clear = substituteVars(raw, props).includes('transparent');
		const k = clear ? `${name}|${key(clampRgb(toRgb(over)))}` : name;
		if (!memo.has(k)) memo.set(k, resolveColor(name, props, mode, over));
		return memo.get(k);
	};
}

function numberToken(props, name) {
	const raw = props.get(`--${name}`);
	if (raw === undefined) throw new Error(`--${name} is not defined`);
	const n = Number.parseFloat(substituteVars(raw, props));
	if (!Number.isFinite(n)) throw new Error(`--${name} is not a number: ${raw}`);
	return n;
}

function literalOrToken(resolve, name, over) {
	if (name === '#000') return BLACK;
	if (name === '#fff') return WHITE;
	// any other literal colour (a fixture's, or a future documented backdrop)
	if (name.startsWith('#')) {
		const c = parse(name);
		if (!c) throw new Error(`cannot parse backdrop colour "${name}"`);
		return c;
	}
	return resolve(name, over);
}

const ratioIn = (fg, bg, mode) =>
	mode === 'black-white'
		? ratio(grayscale(clampRgb(toRgb(fg))), grayscale(clampRgb(toRgb(bg))))
		: ratio(fg, bg);

/** Relative luminance of a colour as the page paints it (on the grayscale in black-white mode). */
function lumaIn(c, mode) {
	const x = clampRgb(toRgb(mode === 'black-white' ? grayscale(clampRgb(toRgb(c))) : c));
	const l = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	return 0.2126 * l(x.r) + 0.7152 * l(x.g) + 0.0722 * l(x.b);
}

/** The opacity (0..1) a fill token paints at: composite over black and over white and compare. */
export function fillAlpha(resolve, fillName) {
	const w = clampRgb(toRgb(resolve(fillName, WHITE)));
	const b = clampRgb(toRgb(resolve(fillName, BLACK)));
	return 1 - (w.r - b.r);
}

/**
 * The backdrop corners of a layer, after the filter, with the layer's `under` scrim applied first.
 * @returns {Array<{ side: string, color: object }>}
 */
export function layerCorners(props, mode, layer) {
	const resolve = makeResolver(props, mode);
	if (!Array.isArray(layer.backdrops) || layer.backdrops.length === 0)
		throw new Error(`layer "${layer.layer}" declares no backdrop set`);
	const set = layer.backdrops.map((b) => {
		const base = literalOrToken(resolve, b, WHITE);
		return layer.under ? resolve(layer.under, base) : base;
	});
	return corners(set, numberToken(props, layer.saturate), numberToken(props, layer.contrast));
}

/**
 * Every pair of one layer for one combination.
 * @returns {{ problems: string[], results: Array<{ layer: string, kind: string, token: string, on: string, corner: string, ratio: number, min: number }> }}
 */
export function checkMaterials(props, mode, label, transparency, layers = MATERIAL_LAYERS) {
	const problems = [];
	const results = [];
	for (const layer of layers) {
		try {
			const resolve = makeResolver(props, mode);
			if (!layer.text?.length && !layer.marks?.length)
				throw new Error(`layer "${layer.layer}" declares no text and no marks`);
			const cs = layerCorners(props, mode, layer);

			if (transparency === 'glass') {
				const alpha = fillAlpha(resolve, layer.fill);
				if (alpha >= GLASS_MAX_ALPHA - 1e-9)
					problems.push(
						`${label} · ${layer.layer}: ${layer.fill} at ${alpha.toFixed(2)} is not glass: lift the text token (vibrancy), add a dim layer behind the layer, or restrict its backdrop · ${alpha.toFixed(2)} >= ${GLASS_MAX_ALPHA.toFixed(2)}`
					);
			}

			// the bound needs the text OUTSIDE the interval its background spans (see below)
			const spans = new Map();
			for (const { side, color } of cs) {
				const corner = side;
				const composite = resolve(layer.fill, color);
				const record = (kind, token, on, fg, bg, min) => {
					const r = ratioIn(fg, bg, mode);
					results.push({ layer: layer.layer, kind, token, on, corner, ratio: r, min });
					const span = spans.get(`${token}|${on}`) ?? { token, on, fg, ys: [] };
					span.ys.push(lumaIn(bg, mode));
					spans.set(`${token}|${on}`, span);
					if (r < min)
						problems.push(
							`${label} · ${layer.layer}: ${token} on ${on} over the ${side === 'lo' ? 'darkest' : 'lightest'} backdrop · ${r.toFixed(2)} < ${min}`
						);
				};
				for (const t of layer.text ?? [])
					record('text', t, layer.fill, resolve(t, composite), composite, TEXT);
				for (const m of layer.marks ?? []) {
					const token = typeof m === 'string' ? m : m.token;
					record('mark', token, layer.fill, resolve(token, composite), composite, m.min ?? UI);
				}
				for (const oc of layer.onControl ?? []) {
					const control = resolve(oc.control, composite);
					for (const t of oc.text)
						record(
							'text',
							t,
							`${oc.control} on ${layer.fill}`,
							resolve(t, control),
							control,
							oc.min ?? TEXT
						);
				}
			}
			// Soundness of the two-corner bound: contrast against a background that spans [lo, hi] is
			// minimal at an end ONLY when the text's luminance is outside that interval. A text token
			// inside it would pass at both ends and still reach 1:1 between them.
			for (const { token, on, fg, ys } of spans.values()) {
				const lo = Math.min(...ys);
				const hi = Math.max(...ys);
				const y = lumaIn(fg, mode);
				if (y > lo + 1e-9 && y < hi - 1e-9)
					problems.push(
						`${label} · ${layer.layer}: ${token} on ${on} has luminance ${y.toFixed(3)} inside the backdrop's range [${lo.toFixed(3)}, ${hi.toFixed(3)}], so the two-corner bound does not hold and the pair can reach 1:1 · 1.00 < 1.01`
					);
			}
		} catch (e) {
			problems.push(`${label} · ${layer.layer} · ${e.message}`);
		}
	}
	return { problems, results };
}

/**
 * The smallest fill opacity (scanning down from 1 in 0.5% steps) at which `token` still reaches `min`
 * over the layer's worst backdrop corner. `null` when even an opaque surface fails. Informational: the
 * `--needs` table, and the proof that a dim layer (`under`) lowers it.
 */
export function minAlpha(props, mode, layer, token, min = TEXT) {
	const resolve = makeResolver(props, mode);
	const surface = resolve(layer.surface);
	const cs = layerCorners(props, mode, layer);
	const passes = (alpha) =>
		cs.every(({ color }) => {
			const composite = paint(surface, alpha, color);
			return ratioIn(resolve(token, composite), composite, mode) >= min;
		});
	if (!passes(1)) return null;
	let a = 1;
	while (a > 0 && passes(a - 0.005)) a -= 0.005;
	return Math.round(a * 1000) / 1000;
}

// ── gate ───────────────────────────────────────────────────────────────────

/**
 * @param {Array<[string, string]>} files [name, css]
 * @param {{ pairs?: Pair[], axes?: typeof AXES, layers?: MaterialLayer[] }} [options] `layers` are the
 *   material layers to prove (none by default: a fixture without materials has no layer to check)
 */
export function checkCss(files, { pairs = PAIRS, axes = AXES, layers = [] } = {}) {
	const problems = [];
	let all = [];
	for (const [file, css] of files) {
		// layouts.css is shell geometry plus a few scoped token re-declarations: its other selectors are not tokens
		const { rules, errors } = parseRules(css, file, { lenient: file.endsWith('/layouts.css') });
		problems.push(...errors);
		all = all.concat(rules.map((r, i) => ({ ...r, order: all.length + i })));
	}
	if (problems.length)
		return { problems, combinations: 0, checked: 0, pairs: pairs.length, materialChecks: 0 };

	let combinations = 0;
	let checked = 0;
	let materialChecks = 0;
	for (const colors of axes.colors)
		for (const mode of axes.mode)
			// black-white resolves as light: the dark palette cannot change it, so run it once
			for (const darkPalette of mode === 'black-white'
				? axes.darkPalette.slice(0, 1)
				: axes.darkPalette)
				for (const sidebarColors of axes.sidebarColors)
					for (const transparency of axes.transparency ?? ['glass']) {
						combinations++;
						const combo = { colors, mode, darkPalette, sidebarColors, transparency };
						const props = propertiesFor(all, combo);
						const label = `${colors}/${mode}/${darkPalette}/${sidebarColors}/${transparency}`;
						for (const pair of pairs) {
							try {
								const r = pairRatio(
									pair,
									pair.scope ? propertiesFor(all, combo, pair.scope) : props,
									mode
								);
								checked++;
								if (r < pair.min)
									problems.push(`${label} · ${pair.label} · ${r.toFixed(2)} < ${pair.min}`);
							} catch (e) {
								problems.push(`${label} · ${pair.label} · ${e.message}`);
							}
						}
						if (layers.length > 0) {
							const m = checkMaterials(props, mode, label, transparency, layers);
							materialChecks += m.results.length;
							problems.push(...m.problems);
						}
					}
	// never pass vacuously
	if (pairs.length === 0 || combinations === 0)
		problems.push('no pairs or no combinations checked');
	return { problems, combinations, checked, pairs: pairs.length, materialChecks };
}

export function check() {
	const files = [];
	const problems = [];
	for (const file of themeFiles()) {
		const path = join(ROOT, file);
		if (!existsSync(path)) problems.push(`${file} not found`);
		else files.push([file, readFileSync(path, 'utf8')]);
	}
	if (problems.length)
		return { problems, combinations: 0, checked: 0, pairs: 0, materialChecks: 0 };
	return checkCss(files, { layers: MATERIAL_LAYERS });
}

/** The parsed rules of every theme file the gate reads (for the `--needs` report). */
function loadRules() {
	let all = [];
	for (const file of themeFiles()) {
		const { rules } = parseRules(readFileSync(join(ROOT, file), 'utf8'), file, {
			lenient: file.endsWith('/layouts.css')
		});
		all = all.concat(rules.map((r, i) => ({ ...r, order: all.length + i })));
	}
	return all;
}

const hex = (c) => {
	const x = clampRgb(toRgb(c));
	return `#${[x.r, x.g, x.b]
		.map((v) =>
			Math.round(v * 255)
				.toString(16)
				.padStart(2, '0')
		)
		.join('')}`;
};
const luminance = (c) => {
	const x = clampRgb(toRgb(c));
	const l = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	return 0.2126 * l(x.r) + 0.7152 * l(x.g) + 0.0722 * l(x.b);
};

/**
 * `--needs`: for the default palette, per layer and mode, the arithmetic of the bound (token -> material
 * -> darkest and lightest backdrop -> contrast), the smallest opacity each text token needs, and the
 * worst ratio over EVERY combination. Informational: it is how the alphas in materials.css were tuned.
 */
export function needsReport() {
	const all = loadRules();
	const lines = [];
	// worst ratio per layer/token over every combination (the margin at the chosen alpha)
	const worst = new Map();
	for (const colors of AXES.colors)
		for (const mode of AXES.mode)
			for (const darkPalette of mode === 'black-white'
				? AXES.darkPalette.slice(0, 1)
				: AXES.darkPalette)
				for (const sidebarColors of AXES.sidebarColors) {
					const props = propertiesFor(all, {
						colors,
						mode,
						darkPalette,
						sidebarColors,
						transparency: 'glass'
					});
					const { results } = checkMaterials(props, mode, '', 'glass');
					for (const r of results) {
						const k = `${mode === 'dark' ? 'dark' : 'light'}|${r.layer}|${r.token}`;
						worst.set(k, Math.min(worst.get(k) ?? Infinity, r.ratio));
					}
				}
	for (const mode of ['light', 'dark']) {
		const combo = {
			colors: 'leadkart',
			mode,
			darkPalette: 'default',
			sidebarColors: 'light',
			transparency: 'glass'
		};
		const props = propertiesFor(all, combo);
		const resolve = makeResolver(props, mode);
		lines.push(`\n== leadkart / ${mode} / default dark palette / light sidebar / glass ==`);
		for (const layer of MATERIAL_LAYERS) {
			const alpha = fillAlpha(resolve, layer.fill);
			const sat = numberToken(props, layer.saturate);
			const con = numberToken(props, layer.contrast);
			lines.push(
				`\n[${layer.layer}] fill ${layer.fill} alpha ${alpha.toFixed(2)}, saturate(${sat}) contrast(${con})${layer.under ? `, under ${layer.under}` : ''}`
			);
			const cs = layerCorners(props, mode, layer);
			for (const { side, color } of cs) {
				const composite = resolve(layer.fill, color);
				lines.push(
					`  ${side === 'lo' ? 'darkest' : 'lightest'} backdrop after filter ${hex(color)} -> composite ${hex(composite)} (Y ${luminance(composite).toFixed(3)})`
				);
			}
			for (const token of layer.text ?? []) {
				const ratios = cs.map(({ color }) => {
					const composite = resolve(layer.fill, color);
					const fg = resolve(token, composite);
					return `${ratioIn(fg, composite, mode).toFixed(2)}`;
				});
				const fgY = luminance(resolve(token, WHITE)).toFixed(4);
				const need = minAlpha(props, mode, layer, token);
				const w = worst.get(`${mode}|${layer.layer}|${token}`);
				lines.push(
					`  ${token.padEnd(28)} Y ${fgY}  darkest ${ratios[0]}  lightest ${ratios[1]}  min alpha ${need === null ? 'n/a (fails opaque)' : need.toFixed(3)}  worst over all combinations ${w?.toFixed(2)}`
				);
			}
			for (const markSpec of layer.marks ?? []) {
				const mark = typeof markSpec === 'string' ? markSpec : markSpec.token;
				const w = worst.get(`${mode}|${layer.layer}|${mark}`);
				lines.push(
					`  mark ${mark.padEnd(23)} worst over all combinations ${w?.toFixed(2)} (needs 3)`
				);
			}
		}
	}
	return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	if (process.argv.includes('--needs')) {
		console.log(needsReport());
		process.exit(0);
	}
	const { problems, combinations, checked, pairs, materialChecks } = check();
	if (problems.length === 0) {
		console.log(
			`✓ check-token-contrast: ${pairs} pair(s) x ${combinations} combination(s) = ${checked} check(s), plus ${materialChecks} material check(s) over ${MATERIAL_LAYERS.length} layer(s) and every transparency level, meet WCAG AA.`
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
