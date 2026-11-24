#!/usr/bin/env node
/**
 * Token-completeness gate (arch test #134).
 *
 * Every `var(--name)` reference in the codebase must resolve to a
 * `--name:` declaration in either src/styles/tokens.css (canonical),
 * src/styles/*.css (layout / utility helper tokens), or the same
 * file (component-local CSS custom properties — common pattern for
 * animation transforms, grid templates, etc.).
 *
 * Catches typos like `var(--color-fg-mute)` that don't fail at
 * parse-time but render as inherited/initial at runtime.
 *
 * Exit code: 0 on clean, 1 on any undefined token reference.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { classElements } from './lib/class-elements.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// ── rule: no alpha modifier on a colour that carries contrast, in the generated primitives ──
//
// shadcn-svelte output writes `hover:bg-primary/90`, `ring-ring/50`, `text-sidebar-foreground/70`,
// `dark:bg-input/30`. The alpha lets the surface behind show through, so the contrast the token
// gate proved for the OPAQUE token no longer holds. The opaque tokens (`bg-primary-hover`,
// `ring-ring`, `text-sidebar-muted-foreground`, `bg-input-fill`) replace them, and the normaliser
// (scripts/shadcn/normalize.mjs) rewrites the defaults. This rule fails on whatever is left.
//
// Allowed, exactly: decorative scrims that sit BEHIND content and carry no text or indicator.
export const UI_DIR = 'src/lib/components/ui/';
// (m2, plan G2) Empty: the one pinned decorative alpha (`bg-black/50`) became `bg-scrim`, a token. The
// only legal alpha in a component is now a material utility (its composite is proved by the gate).
export const ALLOWED_ALPHA = new Set();
/** Hand-written primitives still carrying an alpha, pending regeneration. Empty since Task 5. */
export const PENDING_REGENERATION = new Set();
const COLOUR_UTILITY =
	/(?<![\w-])((?:[\w[\]&>*=.-]+:)*)(bg|text|ring|ring-offset|border-[xytblrse]|border|outline|fill|stroke|divide|decoration|from|via|to|shadow|placeholder|caret|accent)-([a-z][a-z0-9-]*)\/(\d{1,3}|\[[^\]\s]+\])(?![\w/])/g;

// The forms the plain `utility-name/NN` pattern above cannot see, all of which paint a colour the
// contrast gate never checked:
//   bg-[color-mix(in_oklch,var(--x),var(--y)_5%)]      an arbitrary mix
//   text-(--x)/50                                      a custom property with an alpha
//   bg-primary/${n}                                    a dynamic alpha in a template literal
//   opacity-70 on a text-bearing element               alpha by another name (disabled: is exempt)
const COLOUR_PREFIX =
	'bg|text|ring|ring-offset|border-[xytblrse]|border|outline|fill|stroke|divide|decoration|from|via|to|shadow|placeholder|caret|accent';
const VARIANTS = '((?:[\\w[\\]&>*=.-]+:)*)';
const ARBITRARY_MIX = new RegExp(
	`(?<![\\w-])${VARIANTS}((?:${COLOUR_PREFIX})-\\[color-mix\\([^\\]]*\\])`,
	'g'
);
const VAR_ALPHA = new RegExp(
	`(?<![\\w-])${VARIANTS}((?:${COLOUR_PREFIX})-\\(--[\\w-]+\\)/(?:\\d{1,3}|\\[[^\\]\\s]+\\]))(?![\\w/])`,
	'g'
);
const DYNAMIC_ALPHA = new RegExp(
	`(?<![\\w-])${VARIANTS}((?:${COLOUR_PREFIX})-[a-z][a-z0-9-]*/\\$\\{)`,
	'g'
);
const OPACITY = /(?<![\w-])((?:[\w[\]&>*=.()/-]+:)*)(opacity-(?:[1-9]\d?))(?![\w/])/g;
/** A disabled control is exempt from the contrast requirement (WCAG 1.4.3), so its opacity is too. */
const DISABLED_VARIANT = /disabled/;

/** Colour names Tailwind can resolve: the `--color-*` theme entries plus the CSS keywords. */
export function colourNames(tokensCss) {
	const names = new Set(['black', 'white', 'transparent', 'current']);
	for (const m of tokensCss.matchAll(/--color-([\w-]+)\s*:/g)) names.add(m[1]);
	return names;
}

/** @returns {Array<{ line: number, utility: string }>} */
export function findAlphaModifiers(rel, src, names) {
	const norm = rel.replaceAll('\\', '/');
	const inUi = norm.startsWith(UI_DIR);
	if (PENDING_REGENERATION.has(norm)) return [];
	const found = [];
	for (const m of src.matchAll(COLOUR_UTILITY)) {
		const [, variants, prefix, colour, alpha] = m;
		if (!names.has(colour)) continue; // text-sm/6, w-1/2, ...: a size, not a colour
		// outside ui/ only a border colour is held to the rule: a status accent or hairline is an
		// opaque token (border-destructive-indicator / -border), not a faded alpha
		if (!inUi && !prefix.startsWith('border')) continue;
		const utility = `${prefix}-${colour}/${alpha}`;
		if (ALLOWED_ALPHA.has(utility) && variants === '') continue;
		found.push({ line: src.slice(0, m.index).split('\n').length, utility: variants + utility });
	}
	if (!inUi) return found;
	for (const re of [ARBITRARY_MIX, VAR_ALPHA, DYNAMIC_ALPHA]) {
		for (const m of src.matchAll(re)) {
			found.push({ line: src.slice(0, m.index).split('\n').length, utility: m[1] + m[2] });
		}
	}
	for (const m of src.matchAll(OPACITY)) {
		const [, variants, utility] = m;
		if (DISABLED_VARIANT.test(variants)) continue;
		found.push({ line: src.slice(0, m.index).split('\n').length, utility: variants + utility });
	}
	return found;
}

// ── rule: `color-scheme` is declared in one file only ──
//
// Production CSS compiles `light-dark()` to variables resolved on `:root`, so a NESTED
// `color-scheme` flips tokens in dev but not in the build. Only theme/semantic.css sets it.
export const COLOR_SCHEME_FILE = 'src/styles/theme/semantic.css';
/** @returns {Array<{ line: number }>} */
export function findColorScheme(rel, src) {
	if (rel.replaceAll('\\', '/') === COLOR_SCHEME_FILE) return [];
	const stripped = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
	const found = [];
	for (const m of stripped.matchAll(/(?<![\w-])color-scheme\s*:/g))
		found.push({ line: stripped.slice(0, m.index).split('\n').length });
	// Tailwind's `scheme-light` / `scheme-dark` / `scheme-light-dark` utilities set the same property.
	for (const m of stripped.matchAll(
		/(?<![\w-])(?:[\w[\]&>*=.-]+:)*scheme-(?:normal|light|dark|light-dark|only-light|only-dark)(?![\w-])/g
	))
		found.push({ line: stripped.slice(0, m.index).split('\n').length });
	return found;
}

// ── rule: no legacy colour names (Task 16) ──
//
// The pre-Phase-2 names (`--color-bg*`, `--color-fg*`, `--color-brand*`, the logo / secondary / gray /
// status NUMBERED ramps, the glass layer, `--lk-*`) were aliases onto the semantic tokens until Task 16
// deleted them. Nothing may declare or reference one again. `--color-primary-hover` is NOT legacy: it is
// the Phase 2 bridge of the opaque `--primary-hover` token (utility `bg-primary-hover`).
export const LEGACY_PALETTE_FILE = 'src/styles/theme/palettes.css';
const LEGACY_NAME = new RegExp(
	[
		'--color-(?:bg|fg|brand)(?![\\w])[\\w-]*',
		'--color-border-strong',
		'--color-focus-ring',
		'--color-primary-(?:fg|active)(?![\\w-])',
		'--color-(?:gray|secondary|logo|danger|success|warning|info)-\\d[\\w-]*',
		'--color-(?:logo|medical)-[\\w-]*',
		'--color-overlay[\\w-]*',
		'--brand-600',
		'--bg-bg[\\w-]*',
		'--lk-[\\w-]+',
		'(?<![\\w-])--glass-[\\w-]+',
		'(?<![\\w-])glass-[a-z][\\w-]*'
	].join('|'),
	'g'
);

/** @returns {Array<{ line: number, name: string }>} */
export function findLegacyTokens(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (norm === LEGACY_PALETTE_FILE || !norm.startsWith('src/')) return [];
	const found = [];
	for (const m of src.matchAll(LEGACY_NAME))
		found.push({ line: src.slice(0, m.index).split('\n').length, name: m[0] });
	return found;
}

// ── rule: no raw palette colour utility outside the token layer (Task 16) ──
//
// `text-gray-500`, `bg-red-50`, `border-brand-200`, `text-white`, `bg-black/50`: a colour that does
// not follow the theme. The semantic utilities (`text-muted-foreground`, `bg-destructive-soft`,
// `text-primary-foreground`, `bg-foreground/10`) replace them. Exempt, exactly:
//   - src/styles/**                  the token layer itself
//   - GENERATED_UI_FILES             an exact list of unedited CLI output that keeps a shadcn palette class.
//                                    EMPTY since plan G2: the overlays' `bg-black/50` became `bg-scrim`.
// Every other file under ui/ is scanned, including the files LeadKart edited inside generated folders.
export const GENERATED_UI_FILES = [];

const PALETTE_UTILITY = new RegExp(
	'(?<![\\w-])((?:[\\w[\\]&>*=.()/_-]+:)*)' +
		'((?:bg|text|border|border-[xytblrse]|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow|caret|accent)-' +
		'(?:' +
		// a palette name, with or without a step
		'(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\\d{2,3})?' +
		// legacy ramps (a bare `bg-success` / `bg-secondary` / `text-info` is a SEMANTIC token: needs a step)
		'|(?:danger|success|warning|info|secondary)-\\d{2,3}' +
		'|(?:brand|logo)(?:-[a-z0-9-]+)?' +
		'|black|white' +
		')' +
		'(?:\\/(?:\\d{1,3}|\\[[^\\]\\s]+\\]))?)(?![\\w-])',
	'g'
);

/** @returns {Array<{ line: number, utility: string }>} */
export function findPaletteUtilities(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!/\.(svelte|ts)$/.test(norm) || !norm.startsWith('src/')) return [];
	if (norm.startsWith('src/styles/') || GENERATED_UI_FILES.includes(norm)) return [];
	const found = [];
	for (const m of src.matchAll(PALETTE_UTILITY))
		found.push({ line: src.slice(0, m.index).split('\n').length, utility: m[1] + m[2] });
	return found;
}

// ── file rules: one finder per rule, run over every src file by main() ──
//
// (m5, plan G1) A bare `text-primary` is banned: the primary colour is a vivid FILL now (white or a
// dark label sits on it), so text in that colour is `text-primary-text`, a token whose only job is
// 4.5:1 on the surfaces. `text-primary-foreground` (the label ON a fill) and `text-primary-text`
// pass; the word boundary is "not followed by `-`".
const BARE_TEXT_PRIMARY = /(?<![\w-])text-primary(?![\w-])/g;

/** A .svelte file the compiler cannot parse is a FINDING for every rule that reads its classes: no silent fallback. */
const unparsed = (norm) => [
	{
		line: 1,
		name: `${norm} does not parse (Svelte compiler error): the class rules cannot read it`
	}
];
/** `text-(--primary)`, `text-[var(--primary)]`, `text-[color:var(--primary)]`: bare primary text by another name. */
const BARE_TEXT_ARBITRARY = /^text-(?:\(--primary\)|\[(?:color:)?var\(--primary\)\])$/;

export function findBareTextPrimary(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!/\.(svelte|ts|html)$/.test(norm) || !norm.startsWith('src/')) return [];
	const found = [];
	const parsed = norm.endsWith('.svelte') ? classElements(src) : null;
	if (norm.endsWith('.svelte') && !parsed) return unparsed(norm);
	if (parsed) {
		for (const el of [...parsed.elements, ...parsed.scripts])
			for (const t of el.tokens)
				if (t.base === 'text-primary' || BARE_TEXT_ARBITRARY.test(t.base))
					found.push({ line: el.line, name: t.raw });
		return found;
	}
	for (const m of src.matchAll(BARE_TEXT_PRIMARY))
		found.push({ line: src.slice(0, m.index).split('\n').length, name: m[0] });
	return found;
}

/** Source with comments blanked (newlines kept): a rule is about code, not about what a comment names. */
function code(src) {
	const blank = (m) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/(^|[\s;{}(,])\/\/[^\n]*/g, (m, p) => p + blank(m.slice(p.length)));
}

const scan = (src, re) => {
	const found = [];
	for (const m of src.matchAll(re))
		found.push({ line: src.slice(0, m.index).split('\n').length, name: m[0].trim() });
	return found;
};

// (m5, fix round E) The vivid primary is a FILL, so a non-text MARK in the primary colour (a border, a ring,
// an outline, a divider, an svg fill or stroke, a caret, a decoration, a shadow or gradient stop) is
// `*-primary-indicator`, the token that is 3:1 on every surface (lime, green, amber and teal fills reach only
// 1.4-2.4:1). Read from the Svelte AST (scripts/arch/lib/class-elements.mjs): the unit is the ELEMENT.
//   - a bare `border|ring|ring-offset|outline|divide|fill|stroke|caret|decoration|accent|shadow|from|via|to|
//     placeholder[-side]-primary` token on any element, or in any string literal of a <script>, is refused
//     (the allowlist below is exact and empty);
//   - `bg-primary` must have its label (`text-primary-foreground`, any variant) on the SAME element, or on a
//     descendant with no fill of its own in between; otherwise it is a mark (`bg-primary-indicator`). In a
//     <script> string the label must be in the same string. Button / Badge / Checkbox files are free;
//   - a <style> block: `var(--primary)` used for color, border*, outline*, fill, stroke, box-shadow,
//     text-decoration*, caret-color or accent-color is refused; as background it needs `--primary-foreground` in the same rule;
//   - a class fragment built at run time that can end in a utility prefix (`bg-${tone}`, `'bg-' + tone`)
//     could build a primary mark and is refused unless the file is pinned below with the reason.
//   - arbitrary values are the same token: `border-(--primary)`, `border-[var(--primary)]`, `text-[color:var(--primary)]`,
//     `bg-(--primary)`; Tailwind 4's `inset-ring|inset-shadow|drop-shadow|text-shadow` count as marks;
//   - Svelte interpolation (`class="border-{tone}"`) is a built fragment, like a template literal;
//   - `style="…"` and `style:prop` carrying `var(--primary)` for a mark property are refused;
//   - a `text-primary-foreground` in the OTHER arm of a ternary (`on ? 'bg-primary' : 'text-primary-foreground'`)
//     is no label for the fill;
//   - a .svelte file that does not parse is a FINDING naming the file (no silent fallback to a line scan).
// .ts and .html files keep the per-line check (no elements there).
// What it cannot see (it is a lint; the contrast gate proves the tokens): a class list that arrives through a
// variable or a child component's prop; a snippet defined elsewhere and rendered inside a `bg-primary` element
// (its label is not a descendant in the AST); a colour reached through `@apply`, a CSS variable, a non-literal
// inline style, or a `:global()` rule in another file; a utility built by a helper function other than `cn()`.
const MARK_PREFIX =
	'border|ring|ring-offset|inset-ring|inset-shadow|drop-shadow|text-shadow|outline|divide|fill|stroke|caret|decoration|accent|shadow|from|via|to|placeholder';
/** `primary`, or the same token written as an arbitrary value: `(--primary)`, `[var(--primary)]`, `[color:var(--primary)]`. */
const PRIMARY_REF = '(?:primary|\\(--primary\\)|\\[(?:color:)?var\\(--primary\\)\\])';
const PRIMARY_MARK = new RegExp(
	`(?<![\\w-])(?:${MARK_PREFIX})(?:-[tblrxyse])?-${PRIMARY_REF}(?![\\w-])`,
	'g'
);
const PRIMARY_MARK_BASE = new RegExp(`^(?:${MARK_PREFIX})(?:-[tblrxyse])?-${PRIMARY_REF}$`);
const BG_PRIMARY_ARBITRARY = /^bg-(?:\(--primary\)|\[var\(--primary\)\])$/;
/** `bg-primary` in any spelling is the vivid fill: it needs its label. */
const isBgPrimary = (base) => base === 'bg-primary' || BG_PRIMARY_ARBITRARY.test(base);
const PRIMARY_FILL = /(?<![\w-])bg-primary(?![\w-])/g;
export const PRIMARY_MARK_ALLOWLIST = /** @type {string[]} */ ([]);
export const PRIMARY_FILL_FILES = [/^src\/lib\/components\/ui\/(?:button|badge|checkbox)\//];
/** Files that may build a class fragment at run time, with the reason (each is reviewed: none builds `primary`). */
export const DYNAMIC_CLASS_PINNED = /** @type {Record<string, string>} */ ({});
/** <style> uses of the vivid primary that are decoration, not UI: a static wireframe preview, aria-hidden. */
export const PRIMARY_STYLE_PINNED = /** @type {Record<string, string>} */ ({
	'src/lib/layouts/CustomizerTile.svelte':
		'the customizer tiles draw a static wireframe of the layout; the primary there previews the user-chosen colour as a fill, it is not a control'
});
const MARK_PROPS =
	/(?:^|;)\s*(color|border(?:-[a-z-]+)?|outline(?:-[a-z-]+)?|fill|stroke|box-shadow|text-decoration(?:-color)?|caret-color|accent-color)\s*:[^;]*var\(--primary\)(?![\w-])/g;

/** Declarations in a <style> block that use the vivid primary as a mark, or as a fill without its label. */
function styleMarks(parsed, norm) {
	const found = [];
	if (PRIMARY_STYLE_PINNED[norm]) return found;
	for (const { line, css } of parsed.styles) {
		for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
			const body = rule[2];
			const at = line + css.slice(0, rule.index).split('\n').length - 1;
			for (const m of body.matchAll(MARK_PROPS))
				found.push({ line: at, name: `<style> ${m[1]}: var(--primary)` });
			if (
				/(?:^|;)\s*background(?:-color)?\s*:[^;]*var\(--primary\)(?![\w-])/.test(body) &&
				!body.includes('var(--primary-foreground)')
			)
				found.push({
					line: at,
					name: '<style> background: var(--primary) without --primary-foreground'
				});
		}
	}
	return found;
}

const hasFill = (el) =>
	el.tokens.some((t) => /^bg-/.test(t.base) && t.base !== 'bg-primary-foreground');
/** Two ternary branch paths that cannot both hold: the same conditional, different arms. */
const exclusiveBranches = (a = [], b = []) =>
	a.some((x) =>
		b.some((y) => {
			const [ix, ax] = x.split(':');
			const [iy, ay] = y.split(':');
			return ix === iy && ax !== ay;
		})
	);
/** A label counts for a fill unless they sit in the two arms of one ternary (`on ? 'bg-primary' : 'text-primary-foreground'`). */
const labelled = (el, fill) =>
	el.tokens.some((t) => t.base === 'text-primary-foreground' && !exclusiveBranches(t.br, fill.br));

/** A `bg-primary` element is labelled by itself or by a descendant that is reached without crossing another fill. */
function labelledBelow(elements, index, fill) {
	if (labelled(elements[index], fill)) return true;
	const kids = (i) => elements.map((e, k) => (e.parent === i ? k : -1)).filter((k) => k >= 0);
	const stack = kids(index);
	while (stack.length) {
		const k = stack.pop();
		if (labelled(elements[k], fill)) return true;
		if (!hasFill(elements[k])) stack.push(...kids(k));
	}
	return false;
}

export function findPrimaryMarks(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!/\.(svelte|ts|html)$/.test(norm) || !norm.startsWith('src/')) return [];
	if (PRIMARY_MARK_ALLOWLIST.includes(norm)) return [];
	const fillFree = PRIMARY_FILL_FILES.some((re) => re.test(norm));
	const parsed = norm.endsWith('.svelte') ? classElements(src) : null;
	if (norm.endsWith('.svelte') && !parsed) return unparsed(norm);
	if (!parsed) {
		const text = code(src);
		const found = scan(text, PRIMARY_MARK);
		if (!fillFree) {
			const lines = text.split('\n');
			for (const f of scan(text, PRIMARY_FILL))
				if (
					!/(?<![\w-])(?:[\w[\]=:()&>*./-]*:)?text-primary-foreground(?![\w-])/.test(
						lines[f.line - 1]
					)
				)
					found.push(f);
		}
		return found;
	}
	const found = [];
	parsed.elements.forEach((el, i) => {
		for (const t of el.tokens)
			if (PRIMARY_MARK_BASE.test(t.base)) found.push({ line: el.line, name: t.raw });
		if (!fillFree)
			for (const t of el.tokens)
				if (isBgPrimary(t.base) && !labelledBelow(parsed.elements, i, t))
					found.push({ line: el.line, name: t.raw });
	});
	// `style="color: var(--primary)"` and `style:color={…}`: the literal text of an inline style
	for (const { line, css } of parsed.styleAttrs)
		for (const m of css.matchAll(
			new RegExp(MARK_PROPS.source.replace('(?:^|;)', '(?:^|;|\\s)'), 'g')
		))
			found.push({ line, name: `style ${m[1]}: var(--primary)` });
	for (const s of parsed.scripts) {
		for (const t of s.tokens)
			if (PRIMARY_MARK_BASE.test(t.base)) found.push({ line: s.line, name: t.raw });
		if (
			!fillFree &&
			s.tokens.some((t) => isBgPrimary(t.base)) &&
			!s.tokens.some((t) => t.base === 'text-primary-foreground')
		)
			found.push({ line: s.line, name: 'bg-primary' });
	}
	found.push(...styleMarks(parsed, norm));
	if (!DYNAMIC_CLASS_PINNED[norm]) for (const d of parsed.dynamic) found.push(d);
	return found;
}

// (m6, fix round E) On a material, `bg-muted` / `bg-accent` are the translucent control fills. `text-primary-text`
// is solved by construction (each material utility re-declares --primary-text to a step gated on those fills),
// but `--destructive` is also a FILL token, so destructive TEXT on a control fill (2.79-3.19:1) is refused.
// Read from the Svelte AST, per element:
//   - an unprefixed utility applies in EVERY state, so `text-destructive hover:bg-accent` IS destructive text on
//     the hover fill. The text and the fill co-occur unless their variant chains are provably exclusive: the
//     same `data-[k=v]` / `aria-[k=v]` key with different values;
//   - a co-occurrence is safe only when the same element sets a gated fill (`bg-destructive-soft`, `bg-card`,
//     `bg-background`, `bg-popover`) in a state that includes the control fill's whole state (its variants are a
//     superset) and that wins: STRICTLY more variants, or the same variants and later in the list INSIDE a
//     `cn(...)` call (tailwind-merge makes the last one win). In a plain class attribute the stylesheet's own
//     order decides (Tailwind emits same-variant utilities alphabetically), so list order proves nothing there and
//     any co-occurrence with the same variants is a hit. That is the destructive menu item: `focus:bg-accent` +
//     `data-[variant=destructive]:text-destructive` + `data-[variant=destructive]:focus:bg-destructive-soft`;
//   - a `text-destructive` element whose ANCESTOR in the same file carries `bg-muted` / `bg-accent` (any
//     variant) is on that fill, unless an element between them (or the element itself) sets a gated fill.
// A file is a material surface when it uses a `material-*` utility, is a ui primitive of an overlay family,
// imports an overlay primitive by name from the ui barrel or the ui folders (Dialog, AlertDialog, Sheet, Drawer,
// Popover, DropdownMenu or its barrel alias Dropdown, Select, Command, Combobox, Sidebar, Toaster, and the wrappers
// ConfirmDialog, FormSheet, FormDialog), imports an overlay FAMILY as a namespace
// (`import * as Dialog from '#lib/components/ui/dialog/index.ts'`), or default-imports a wrapper file
// (`ConfirmDialog.svelte`, `FormSheet.svelte`, `FormDialog.svelte`, `*Drawer.svelte`): one level of wrapping. The
// wrapper's own consumers' wrappers (a file that imports `SuspendDialog`, which imports ConfirmDialog) are NOT
// followed. A .svelte file that does not parse is a finding. What it cannot see: a label that another component
// renders into a slot, or a snippet defined elsewhere and rendered inside a control fill.
export const MATERIAL_SURFACE_FILES = [
	/^src\/lib\/components\/ui\/(?:dialog|alert-dialog|sheet|drawer|popover|dropdown-menu|select|command|combobox|sonner|sidebar|AuthCard)[\w./-]*$/
];
/** Names of overlay primitives and of the wrappers built on them (`Dropdown` is the barrel alias of DropdownMenu). */
const OVERLAY_IMPORTS =
	/\b(?:Dialog|AlertDialog|Sheet|Drawer|Popover|DropdownMenu|Dropdown|Select|Command|Combobox|Sidebar|Toaster|ConfirmDialog|FormSheet|FormDialog)\b/;
/** `import * as Dialog from '#lib/components/ui/dialog/index.ts'`: a namespace import of an overlay family. */
const OVERLAY_NAMESPACE =
	/import\s*\*\s*as\s+\w+\s+from\s*['"][^'"]*\/(?:dialog|alert-dialog|sheet|drawer|popover|dropdown-menu|select|command|combobox|sonner|sidebar)\/index\.ts['"]/;
/** A default import of a wrapper that renders an overlay (one level of wrapping; the wrapper files are material surfaces themselves). */
const OVERLAY_WRAPPER_FILE =
	/import\s+(?:type\s+)?\w+\s+from\s*['"][^'"]*\/(?:ConfirmDialog|FormSheet|FormDialog|\w*Drawer)\.svelte['"]/;
/** A named import of a wrapper that renders an overlay from a barrel (`{ ReasonConfirmDialog } from '#lib/components/feedback/index.ts'`, `{ FormSheet } from '#lib/components/form/index.ts'`). */
const OVERLAY_WRAPPER_NAMED =
	/import\s*\{[^}]*\b(?:ReasonConfirmDialog|FormSheet|FormDialog)\b[^}]*\}\s*from\s*['"][^'"]+['"]/;
const OVERLAY_FROM =
	/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"](?:#lib\/components\/ui\/index\.ts|#lib\/components\/ui(?:\/(?:dialog|alert-dialog|sheet|drawer|popover|dropdown-menu|select|command|combobox|sonner|sidebar)[^'"]*)?)['"]/g;
const CONTROL_BG = new Set(['bg-muted', 'bg-accent']);
const GATED_FILL = new Set(['bg-destructive-soft', 'bg-card', 'bg-background', 'bg-popover']);

function isMaterialSurface(norm, parsed) {
	if (MATERIAL_SURFACE_FILES.some((re) => re.test(norm))) return true;
	if (parsed.usesMaterial) return true;
	for (const m of parsed.text.matchAll(OVERLAY_FROM)) if (OVERLAY_IMPORTS.test(m[1])) return true;
	return (
		OVERLAY_NAMESPACE.test(parsed.text) ||
		OVERLAY_WRAPPER_FILE.test(parsed.text) ||
		OVERLAY_WRAPPER_NAMED.test(parsed.text)
	);
}

/** Two variant chains that cannot both hold: the same data-/aria- attribute selector with different values. */
function exclusive(a, b) {
	const key = (v) => /^(data|aria)-\[([\w-]+)=([^\]]+)\]$/.exec(v);
	for (const x of a) {
		const kx = key(x);
		if (!kx) continue;
		for (const y of b) {
			const ky = key(y);
			if (ky && ky[1] === kx[1] && ky[2] === kx[2] && ky[3] !== kx[3]) return true;
		}
	}
	return false;
}
const superset = (big, small) => small.every((v) => big.includes(v));

export function findTextOnControl(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!/\.svelte$/.test(norm) || !norm.startsWith('src/')) return [];
	const parsed = classElements(src);
	if (!parsed) return unparsed(norm);
	if (!isMaterialSurface(norm, parsed)) return [];
	const found = [];
	const gatedHere = (el, vb, bIndex, b) =>
		el.tokens.some(
			(g, gi) =>
				GATED_FILL.has(g.base) &&
				superset(g.variants, vb) &&
				// "later wins" is the class-list order inside cn() (tailwind-merge) ONLY; in a plain class attribute the
				// stylesheet's own order decides, so there only a strictly more specific state is a winner
				(g.variants.length > vb.length || (g.cn && b.cn && gi > bIndex))
		);
	parsed.elements.forEach((el, i) => {
		const texts = el.tokens.filter((t) => t.base === 'text-destructive');
		if (!texts.length) return;
		for (const t of texts) {
			el.tokens.forEach((b, bi) => {
				if (!CONTROL_BG.has(b.base) || exclusive(t.variants, b.variants)) return;
				if (gatedHere(el, b.variants, bi, b)) return;
				found.push({ line: el.line, name: `${b.raw} with ${t.raw}` });
			});
			// an ancestor's control fill, unless this element or one between sets a gated fill
			if (el.tokens.some((g) => GATED_FILL.has(g.base) && g.variants.length === 0)) continue;
			let up = el.parent;
			while (up >= 0) {
				const a = parsed.elements[up];
				const fill = a.tokens.find((b) => CONTROL_BG.has(b.base));
				if (fill) {
					found.push({ line: el.line, name: `${t.raw} inside ${fill.raw} (line ${a.line})` });
					break;
				}
				if (a.tokens.some((g) => GATED_FILL.has(g.base) && g.variants.length === 0)) break;
				up = a.parent;
			}
		}
		void i;
	});
	return found;
}

// (m1, plan G2) `backdrop-*` utilities and the CSS properties `backdrop-filter` / `-webkit-backdrop-filter`
// are legal only where a material is DEFINED: theme/materials*.css, the `@utility material-*` blocks of
// utilities.css, and the pattern band's `backdrop-filter: none` in layouts.css. Glass is never drawn
// by a component.
export const BACKDROP_FILES = [
	/^src\/styles\/theme\/materials[\w-]*\.css$/,
	/^src\/styles\/utilities\.css$/,
	/^src\/styles\/theme\/layouts\.css$/
];
const BACKDROP =
	/(?<![\w-])(?:supports-backdrop-filter|(?:-webkit-)?backdrop-(?:blur|saturate|brightness|contrast|filter|grayscale|hue-rotate|invert|opacity|sepia)(?![\w]))/g;
export function findBackdrop(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!norm.startsWith('src/') || BACKDROP_FILES.some((re) => re.test(norm))) return [];
	return scan(code(src), BACKDROP);
}

// (m3) A `--material-*` or `--scrim` DECLARATION outside theme/materials*.css fails; a `var(--material-*)`
// REFERENCE is legal in src/styles/** and in the <style> blocks of src/lib/layouts/**, nowhere else.
export function findMaterialTokens(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!norm.startsWith('src/') || /^src\/styles\/theme\/materials[\w-]*\.css$/.test(norm))
		return [];
	const text = code(src);
	const found = scan(text, /(?<![\w-])--(?:material-[\w-]+|scrim)\s*:/g);
	if (norm.startsWith('src/styles/')) return found;
	const outsideStyle = norm.startsWith('src/lib/layouts/')
		? text.replace(/<style\b[\s\S]*?<\/style>/g, (m) => m.replace(/[^\n]/g, ' '))
		: text;
	return found.concat(scan(outsideStyle, /var\(\s*--material-[\w-]+/g));
}

// (m4) `will-change` pins a compositor layer and multiplies the cost of every blurred layer behind or
// above it. Legal only in src/styles/animations.css.
export function findWillChange(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!norm.startsWith('src/') || norm === 'src/styles/animations.css') return [];
	return scan(code(src), /(?<![\w-])will-change(?!\w)/g);
}

export const FILE_RULES = [
	{
		id: 'm5',
		title: 'bare text-primary, or the vivid primary used as a mark',
		find: (rel, src) => [...findBareTextPrimary(rel, src), ...findPrimaryMarks(rel, src)],
		fix: 'use text-primary-text (links, active labels), text-primary-foreground (a label on a primary fill), or *-primary-indicator (a border, ring, outline, divider, fill, stroke or bar in the primary colour).'
	},
	{
		id: 'm6',
		title: 'text-destructive on a bg-muted / bg-accent control fill in a material surface',
		find: findTextOnControl,
		fix: 'destructive text on a control fill on glass does not reach 4.5:1; use text-foreground, text-muted-foreground or text-accent-foreground there, put the text on the pane itself, or give the state its own bg-destructive-soft.'
	},
	{
		id: 'm1',
		title: 'backdrop-* outside a material definition',
		find: findBackdrop,
		fix: 'use material-bar / material-pane / material-sidebar (utilities.css); only theme/materials*.css, utilities.css and layouts.css may touch a backdrop filter.'
	},
	{
		id: 'm3',
		title: '--material-* / --scrim declared or read outside the material layer',
		find: findMaterialTokens,
		fix: 'declare it in src/styles/theme/materials*.css; read it only in src/styles/** or a <style> block of src/lib/layouts/**.'
	},
	{
		id: 'm4',
		title: 'will-change',
		find: findWillChange,
		fix: 'remove it (a pinned layer multiplies the cost of blurred layers); animations.css is the one exception.'
	}
];

function main() {
	// 1. Collect global tokens from src/styles/*.css and src/styles/theme/*.css.
	const globalTokens = new Set();
	for (const rel of globSync('src/styles/{,theme/}*.css', { cwd: ROOT })) {
		const src = readFileSync(join(ROOT, rel), 'utf8');
		for (const m of src.matchAll(/--([\w-]+)\s*:/g)) globalTokens.add(m[1]);
	}

	// 2. Tailwind 4 + bits-ui + browser-synthesised custom properties.
	const SYNTHETIC_PREFIXES = [
		'tw-',
		'bits-',
		'radix-',
		'sf-',
		// SvelteKit / vite HMR internals
		'sveltekit-',
		'vite-'
	];
	const SYNTHETIC_EXACT = new Set([
		'safe-area-inset-top',
		'safe-area-inset-bottom',
		'safe-area-inset-left',
		'safe-area-inset-right'
	]);

	// 3. Animation / dynamic-style placeholder prefixes (component-local).
	const DYNAMIC_PREFIXES = ['lk-', 'enter-', 'exit-', 'leave-'];

	function isAllowed(name, localTokens) {
		if (globalTokens.has(name)) return true;
		if (localTokens.has(name)) return true;
		if (SYNTHETIC_EXACT.has(name)) return true;
		if (SYNTHETIC_PREFIXES.some((p) => name.startsWith(p))) return true;
		if (DYNAMIC_PREFIXES.some((p) => name.startsWith(p))) return true;
		// Single-letter / two-letter axis names commonly used inline as
		// dynamic style binds (--x, --y, --c1, --c2, --len, --rot, --scale, --delay).
		if (/^[a-z]{1,2}\d?$/.test(name)) return true;
		if (
			[
				'x',
				'y',
				'len',
				'rot',
				'scale',
				'delay',
				'push-x',
				'push-y',
				'c1',
				'c2',
				'c3',
				'duration',
				'progress'
			].includes(name)
		)
			return true;
		return false;
	}

	// Skip pure placeholder strings that show up in template literals or
	// comments (e.g. `var(--color-)` in a styleguide example, `var(--z-X)`).
	function isPlaceholder(name) {
		if (/[A-Z]/.test(name)) return true; // ALL_CAPS or PascalCase
		if (name.endsWith('-')) return true; // trailing hyphen
		if (name === '') return true;
		return false;
	}

	const SCAN_GLOB = ['src/**/*.css', 'src/**/*.svelte', 'src/**/*.ts', 'src/**/*.html'];

	const undefinedRefs = [];
	for (const pattern of SCAN_GLOB) {
		const files = globSync(pattern, {
			cwd: ROOT,
			exclude: ['src/lib/api/generated/**', 'src/styles/tokens.css', 'src/styles/theme/**']
		});
		for (const rel of files) {
			const abs = join(ROOT, rel);
			const src = readFileSync(abs, 'utf8');

			// Collect file-local --name: declarations (including <style> blocks).
			const localTokens = new Set();
			for (const m of src.matchAll(/--([\w-]+)\s*:/g)) localTokens.add(m[1]);

			// var() pattern with optional fallback expression. The `(?:,...)`
			// match captures the comma — if present, this is a cascade-override
			// slot (parent can set --foo, otherwise use the fallback), which is
			// legitimately a tokenless reference.
			for (const m of src.matchAll(/var\(\s*--([\w-]+)\s*(,)?/g)) {
				const name = m[1];
				const hasFallback = m[2] === ',';
				if (isPlaceholder(name)) continue;
				if (hasFallback) continue; // cascade-override slot — see comment above
				if (!isAllowed(name, localTokens)) {
					const lineNo = src.slice(0, m.index).split('\n').length;
					undefinedRefs.push({ file: rel.replaceAll('\\', '/'), line: lineNo, name });
				}
			}
		}
	}

	// 4. Alpha modifiers on contrast-bearing colours in the generated primitives; color-scheme in one file.
	const names = colourNames(readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8'));
	const alphaRefs = [];
	const schemeRefs = [];
	const legacyRefs = [];
	const paletteRefs = [];
	const ruleRefs = FILE_RULES.map((rule) => ({ rule, found: [] }));
	for (const pattern of ['src/**/*.svelte', 'src/**/*.ts', 'src/**/*.css', 'src/**/*.html']) {
		for (const rel of globSync(pattern, { cwd: ROOT, exclude: ['src/lib/api/generated/**'] })) {
			const norm = rel.replaceAll('\\', '/');
			const src = readFileSync(join(ROOT, rel), 'utf8');
			if (!pattern.endsWith('.css'))
				for (const f of findAlphaModifiers(norm, src, names)) alphaRefs.push({ file: norm, ...f });
			for (const f of findColorScheme(norm, src)) schemeRefs.push({ file: norm, ...f });
			for (const f of findLegacyTokens(norm, src)) legacyRefs.push({ file: norm, ...f });
			for (const f of findPaletteUtilities(norm, src)) paletteRefs.push({ file: norm, ...f });
			for (const r of ruleRefs)
				for (const f of r.rule.find(norm, src)) r.found.push({ file: norm, ...f });
		}
	}

	if (
		undefinedRefs.length +
			alphaRefs.length +
			schemeRefs.length +
			legacyRefs.length +
			paletteRefs.length +
			ruleRefs.reduce((a, r) => a + r.found.length, 0) ===
		0
	) {
		console.log(
			`✓ check-tokens: ${globalTokens.size} global token(s) defined, every var(--*) reference resolves; no alpha modifier on a contrast colour in ui/; color-scheme only in theme/semantic.css; no legacy colour name; no raw palette utility; ${FILE_RULES.length} file rule(s) (${FILE_RULES.map((r) => r.id).join(', ')}) clean.`
		);
		process.exit(0);
	}

	if (undefinedRefs.length) {
		console.error(`✗ check-tokens: ${undefinedRefs.length} undefined token reference(s):\n`);
		for (const ref of undefinedRefs) {
			console.error(`  ${ref.file}:${ref.line}  var(--${ref.name})`);
		}
		console.error(
			'\nFix: add the token to src/styles/tokens.css, OR correct the typo, OR declare it file-locally (e.g. inside a <style> block).'
		);
	}
	if (alphaRefs.length) {
		console.error(
			`✗ check-tokens: ${alphaRefs.length} alpha modifier(s) on a colour utility in ${UI_DIR}:\n`
		);
		for (const r of alphaRefs) console.error(`  ${r.file}:${r.line}  ${r.utility}`);
		console.error(
			'\nFix: use the opaque token (hover:bg-primary-hover, ring-ring, text-sidebar-muted-foreground, bg-input-fill), or add a token. Only scrims in ALLOWED_ALPHA may carry an alpha.'
		);
	}
	if (schemeRefs.length) {
		console.error(`✗ check-tokens: color-scheme declared outside ${COLOR_SCHEME_FILE}:\n`);
		for (const r of schemeRefs) console.error(`  ${r.file}:${r.line}`);
		console.error(
			'\nFix: a nested color-scheme flips light-dark() tokens in dev but not in the production build. Override the tokens on :root[data-...] or on a scoped selector that re-declares them.'
		);
	}
	if (legacyRefs.length) {
		console.error(`✗ check-tokens: ${legacyRefs.length} legacy colour name(s):\n`);
		for (const r of legacyRefs) console.error(`  ${r.file}:${r.line}  ${r.name}`);
		console.error('\nFix: use the semantic token (see plan L7); never re-add a legacy alias.');
	}
	if (paletteRefs.length) {
		console.error(`✗ check-tokens: ${paletteRefs.length} raw palette colour utility(ies):\n`);
		for (const r of paletteRefs) console.error(`  ${r.file}:${r.line}  ${r.utility}`);
		console.error(
			'\nFix: text-muted-foreground, bg-destructive-soft, text-primary-foreground, bg-foreground/10, ... (plan L7). Exempt: src/styles/** and the CLI-generated ui/ folders.'
		);
	}
	for (const { rule, found } of ruleRefs) {
		if (found.length === 0) continue;
		console.error(`✗ check-tokens (${rule.id}): ${found.length} ${rule.title}:\n`);
		for (const r of found) console.error(`  ${r.file}:${r.line}  ${r.name}`);
		console.error(`\nFix: ${rule.fix}`);
	}
	process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
