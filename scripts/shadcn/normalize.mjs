#!/usr/bin/env node
/**
 * Post-CLI normaliser for shadcn-svelte output (`node scripts/shadcn/normalize.mjs <files…>`).
 *
 * The CLI's output is copied into `src/lib/components/ui/`; this makes it match the project:
 *
 *   1. imports: `$lib/utils.js` (and every other spelling of cn) -> `#lib/utils/cn.ts`;
 *      `$lib/components/ui/` -> `#lib/components/ui/` (`index.js` -> `index.ts`)
 *   2. icons: `import XIcon from '@lucide/svelte/icons/x'` -> `import { X as XIcon } from
 *      '#lib/icons/index.ts'`; FAILS, listing the names, when the registry lacks one
 *   3. several named imports from one module become one statement (eslint no-duplicate-imports)
 *   4. physical -> logical utilities (`ml-` -> `ms-`, `left-` -> `start-`, `border-l` -> `border-s`,
 *      `rounded-l` -> `rounded-s`, `text-left` -> `text-start`, …), variant prefixes kept;
 *      animation names (`slide-in-from-left-*`) and centring (`left-1/2`) are left alone
 *   5. opaque tokens (plan L37): `hover:bg-primary/90` -> `hover:bg-primary-hover`,
 *      `ring-ring/50` -> `ring-ring`, `dark:bg-input/30` -> `dark:bg-input-fill`, …
 *   6. `tailwind-variants` -> `cva`: `tv({ base: '…', variants })` becomes `cva('…', { variants })`
 *      (the `slots` form is not supported and FAILS)
 *   7. `z-50` becomes the layer of the component family (`Z_BY_FAMILY`): modal surfaces (dialog,
 *      sheet, alert-dialog) `--z-modal` for panel AND scrim, so a modal opened later covers an
 *      earlier one; sidebar and sticky parts `--z-sticky`; floating content (popover, select,
 *      dropdown, calendar popups) `--z-popover`
 *   8. the pane material (plan G5, `MATERIAL_BY_FAMILY`): the content of a dialog, alert dialog, sheet, popover,
 *      dropdown menu and select is `material-pane` (its `bg-popover`, shadow, ring and ring colour go, the radius
 *      is `rounded-xl`; a sheet's side borders go, the material's edge replaces them); the items are `rounded-lg`;
 *      the command root is transparent (the dialog or popover around it is the material)
 *   9. FAILS on any `/<alpha>` modifier left on a text, ring, border-input or solid-fill colour
 *      (the same rule as the `check-tokens` arch gate; no alpha is allowed: the scrim is `bg-scrim`)
 *
 * Only class strings are rewritten: `class="…"`, `class={…}` and the arguments of `cn(…)` / `cva(…)`,
 * and inside those only string literals. A comment, a JS string or a placement such as `left-start`
 * is never touched.
 *
 * Idempotent: a second run changes nothing.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_ALPHA, UI_DIR, colourNames, findAlphaModifiers } from '../arch/check-tokens.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// ── the icon registry ──────────────────────────────────────────────────────

/** Names exported by `src/lib/icons/index.ts` (the `as` name when renamed). */
export function iconExports() {
	const src = readFileSync(join(ROOT, 'src/lib/icons/index.ts'), 'utf8');
	const names = new Set();
	for (const m of src.matchAll(/export\s*\{([^}]*)\}\s*from\s*['"]@lucide\/svelte['"]/g))
		for (const part of m[1].split(',')) {
			const item = part
				.trim()
				.replace(/\/\/.*$/gm, '')
				.trim();
			if (!item) continue;
			names.add(
				item
					.split(/\s+as\s+/)
					.pop()
					.trim()
			);
		}
	return names;
}

const pascal = (slug) =>
	slug
		.split('-')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join('');

// ── class rewrites ─────────────────────────────────────────────────────────

/** [utility regex, replacement, only when a variant of the chain matches]. */
const OPAQUE = [
	[/^bg-primary\/90$/, 'bg-primary-hover', /(^|:)hover$/],
	[/^bg-destructive\/90$/, 'bg-destructive-hover', /(^|:)hover$/],
	[/^ring-ring\/50$/, 'ring-ring'],
	[/^text-sidebar-foreground\/70$/, 'text-sidebar-muted-foreground'],
	[/^bg-input\/30$/, 'bg-input-fill'],
	[/^border-input\/30$/, 'border-input'],
	[/^ring-foreground\/10$/, 'ring-border'],
	[/^bg-muted\/50$/, 'bg-muted'],
	[/^bg-destructive\/(?:10|20)$/, 'bg-destructive-soft'],
	// selected-card tint of a field label: the soft primary fill and the full border
	[/^bg-primary\/(?:5|10)$/, 'bg-primary-soft'],
	[/^border-primary\/(?:20|30)$/, 'border-primary'],
	// disabled / hovered control fill: the muted surface (disabled text is exempt, hover is `foreground`)
	[/^bg-input\/(?:50|80)$/, 'bg-muted', /(^|:)(?:disabled|hover)$/],
	// the unchecked switch track in dark
	[/^bg-input\/80$/, 'bg-input'],
	// calendar day hover and range-middle hover: the accent fill, or none over the accent cell
	[/^bg-accent\/50$/, 'bg-accent'],
	[/^bg-accent\/0$/, 'bg-transparent'],
	// the overlay scrim: the `--scrim` token (35% light, 55% dark, no blur); the shadcn default
	// `bg-black/50 supports-backdrop-filter:backdrop-blur-xs` and the nova `bg-black/10` both become it
	[/^bg-black\/(?:10|50)$/, 'bg-scrim'],
	// secondary text: the muted token, not the foreground at 60%
	[/^text-foreground\/60$/, 'text-muted-foreground'],
	// nova style hook (no CSS behind it in this repo): flip the chevron in RTL
	[/^cn-rtl-flip$/, 'rtl:rotate-180'],
	// plan G1: the primary colour is a vivid FILL now; text in it is `primary-text` (4.5:1), and a link
	// does not change colour on hover (it underlines)
	[/^text-primary$/, 'text-primary-text'],
	[/^text-primary-hover$/, 'underline', /(^|:)hover$/]
];

/**
 * Plan G1: the marks of these families are non-text (3:1), not fills with a label: they read
 * `primary-indicator`. Rewritten only inside these ui folders.
 */
const INDICATOR_FAMILIES = new Set([
	'checkbox',
	'radio-group',
	'switch',
	'slider',
	'progress',
	'tabs'
]);
const INDICATOR = [
	[/^bg-primary$/, 'bg-primary-indicator'],
	[/^border-primary$/, 'border-primary-indicator'],
	[/^text-primary-foreground$/, 'text-primary-indicator-foreground'],
	[/^bg-primary-foreground$/, 'bg-primary-indicator-foreground']
];

/**
 * Plan G5: which ui folders sit on the pane material, and what the content file and the item files of each become.
 * `content` files are `*-content.svelte`; `item` files are the rows inside it. The rules apply to class tokens only
 * (`rewriteToken`), with the variant chain kept.
 */
const MATERIAL_BY_FAMILY = {
	dialog: 'pane',
	'alert-dialog': 'pane',
	sheet: 'pane',
	popover: 'pane',
	'dropdown-menu': 'pane',
	select: 'pane',
	command: 'root'
};
const CONTENT_FILE = /-content\.svelte$/;
const ITEM_FILE = /(?:-item|-checkbox-item|-radio-item|-sub-trigger)\.svelte$/;
const MATERIAL_CONTENT = [
	[/^bg-popover$/, 'material-pane'],
	[/^rounded-(?:lg|md)$/, 'rounded-xl']
];
/** Dropped from a material's content: the material draws its own shadow and edge. */
const MATERIAL_DROP = [
	{ variants: /^$/, utility: /^(?:shadow-md|shadow-lg|ring-1|ring-border)$/ },
	// a sheet's side border: the material's edge replaces it
	{ variants: /^data-\[side=(?:top|bottom|left|right)\]$/, utility: /^border-(?:t|b|s|e)$/ }
];
const MATERIAL_ITEM = [[/^rounded-(?:sm|md)$/, 'rounded-lg']];
const MATERIAL_ROOT = [[/^bg-popover$/, 'bg-transparent']];

/** The role of a file inside a material family: `content`, `item`, `root`, or undefined. */
export function materialRole(file = '') {
	const family = familyOf(file);
	const kind = family && MATERIAL_BY_FAMILY[family];
	if (!kind) return undefined;
	const base = file.replaceAll('\\', '/').split('/').pop() ?? '';
	if (kind === 'root')
		return base === 'command.svelte'
			? 'root'
			: ITEM_FILE.test(base) || /^command-(?:link-)?item\.svelte$/.test(base)
				? 'item'
				: undefined;
	if (CONTENT_FILE.test(base)) return 'content';
	if (ITEM_FILE.test(base)) return 'item';
	return undefined;
}

/**
 * Customizations of one generated file (see `src/lib/components/ui/CUSTOMIZATIONS.md`), so a regeneration keeps them.
 * `swap`: a whole class (variants included) becomes another. `ensure`: a class that must be present, inserted before `before`
 * (or first when `before` is absent); a class already there is never added twice.
 *
 * The alert dialog is a flex column capped at 90dvh: its header and footer never shrink and the body between them scrolls,
 * so a tall confirmation keeps its buttons inside a 360 x 640 phone; the default width is `sm:max-w-md` (a reason field
 * needs the room).
 */
const FILE_CUSTOM = {
	'alert-dialog/alert-dialog-content.svelte': {
		swap: {
			grid: 'flex flex-col',
			'data-[size=default]:sm:max-w-sm': 'data-[size=default]:sm:max-w-md'
		},
		ensure: [{ add: 'max-h-[90dvh]', before: 'gap-4' }]
	},
	'alert-dialog/alert-dialog-header.svelte': { ensure: [{ add: 'shrink-0' }] },
	'alert-dialog/alert-dialog-footer.svelte': {
		ensure: [{ add: 'shrink-0', before: 'rounded-b-xl' }]
	}
};

/** The customizations of a path (`family/file.svelte`), or undefined. */
export function customFor(file = '') {
	return FILE_CUSTOM[file.replaceAll('\\', '/').split('/').slice(-2).join('/')];
}

/** Index of `token` as a whole class in `text`, or -1 (a class is delimited by whitespace, quotes or the ends). */
function indexOfClass(text, token) {
	const delimiter = (c) => c === undefined || /[\s"'`{}]/.test(c);
	for (let at = text.indexOf(token); at >= 0; at = text.indexOf(token, at + 1))
		if (delimiter(text[at - 1]) && delimiter(text[at + token.length])) return at;
	return -1;
}

/** Adds each `ensure` class that is missing (before its anchor when the anchor is there, else first). */
function ensureClasses(text, custom) {
	let out = text;
	for (const { add, before } of custom?.ensure ?? []) {
		if (out.trim() === '' || indexOfClass(out, add) >= 0) continue;
		const at = before ? indexOfClass(out, before) : -1;
		if (before && at < 0) continue;
		const lead = before ? at : out.length - out.trimStart().length;
		out = `${out.slice(0, lead)}${add} ${out.slice(lead)}`;
	}
	return out;
}

/** Invalid-state ring/border alphas on a control: dropped (the control shows `aria-invalid` through its own border token). */
const DROP = [
	{ variants: /aria-invalid/, utility: /^(?:ring|border)-destructive\/\d+$/ },
	// `aria-invalid:ring-3` has no colour left once its alpha ring colour is gone: it would paint a
	// currentColor ring. The invalid border (`aria-invalid:border-destructive`) is the signal.
	{ variants: /aria-invalid/, utility: /^ring-3$/ },
	// the switch thumb in dark: `bg-foreground` on the dark `input` track is 2.4:1 in the gray dark
	// palette (gate pair background on input holds in all 400), so the thumb stays `bg-background`
	{ variants: /^dark:data-unchecked$/, utility: /^bg-foreground$/ },
	// the scrim dims, it never blurs (a full-viewport blur is the most expensive layer there is)
	{ variants: /^supports-backdrop-filter$/, utility: /^backdrop-blur-/ },
	{ variants: /^$/, utility: /^backdrop-blur-/ }
];

/** Layer of a generated `z-50`, by the ui folder the file lives in. Anything else is floating content. */
const Z_BY_FAMILY = {
	dialog: 'z-(--z-modal)',
	sheet: 'z-(--z-modal)',
	'alert-dialog': 'z-(--z-modal)',
	sidebar: 'z-(--z-sticky)',
	table: 'z-(--z-sticky)'
};
const Z_FLOATING = 'z-(--z-popover)';

/** The ui folder a file lives in (`checkbox`, `dialog`, ...), or undefined. */
export function familyOf(file = '') {
	const parts = file.replaceAll('\\', '/').split('/');
	const i = parts.lastIndexOf('ui');
	return i >= 0 ? parts[i + 1] : undefined;
}

export function zLayerFor(file = '') {
	const family = familyOf(file);
	return (family && Z_BY_FAMILY[family]) || Z_FLOATING;
}

const PHYSICAL = [
	[
		/^(-?)(ml|mr|pl|pr)-(.+)$/,
		(_m, neg, p, rest) => `${neg}${{ ml: 'ms', mr: 'me', pl: 'ps', pr: 'pe' }[p]}-${rest}`
	],
	[
		/^(-?)(left|right)-(.+)$/,
		(m, neg, side, rest) =>
			/^\d+\/\d+$/.test(rest) ? m : `${neg}${side === 'left' ? 'start' : 'end'}-${rest}`
	],
	[/^text-(left|right)$/, (_m, s) => `text-${s === 'left' ? 'start' : 'end'}`],
	[/^border-(l|r)(-.+)?$/, (_m, s, rest = '') => `border-${s === 'l' ? 's' : 'e'}${rest}`],
	[
		/^rounded-(l|r|tl|tr|bl|br)(-.+)?$/,
		(_m, s, rest = '') =>
			`rounded-${{ l: 's', r: 'e', tl: 'ss', tr: 'se', bl: 'es', br: 'ee' }[s]}${rest}`
	]
];

/** Split `a:b:[x:y]:utility` at the last `:` that is outside brackets and parentheses. */
function splitVariants(token) {
	let depth = 0;
	let cut = -1;
	for (let i = 0; i < token.length; i++) {
		const c = token[i];
		if (c === '[' || c === '(') depth++;
		else if (c === ']' || c === ')') depth--;
		else if (c === ':' && depth === 0) cut = i;
	}
	return cut < 0 ? ['', token] : [token.slice(0, cut), token.slice(cut + 1)];
}

function rewriteToken(token, z = Z_FLOATING, family, role, custom) {
	const [variants, utility] = splitVariants(token);
	if (custom?.swap?.[token]) return custom.swap[token];
	if (DROP.some((d) => d.variants.test(variants) && d.utility.test(utility))) return '';
	if (
		role === 'content' &&
		MATERIAL_DROP.some((d) => d.variants.test(variants) && d.utility.test(utility))
	)
		return '';
	let next = utility;
	if (!variants || role === 'item') {
		const table =
			role === 'content'
				? MATERIAL_CONTENT
				: role === 'item'
					? MATERIAL_ITEM
					: role === 'root'
						? MATERIAL_ROOT
						: [];
		for (const [re, to] of table)
			if (re.test(next)) {
				next = to;
				break;
			}
	}
	if (next === 'z-50') next = z;
	for (const [re, to, when] of OPAQUE) {
		if (re.test(next) && (!when || when.test(variants))) {
			next = to;
			break;
		}
	}
	if (family && INDICATOR_FAMILIES.has(family)) {
		for (const [re, to] of INDICATOR) {
			if (re.test(next)) {
				next = to;
				break;
			}
		}
	}
	for (const [re, to] of PHYSICAL) {
		if (re.test(next)) {
			next = next.replace(re, to);
			break;
		}
	}
	return next === utility ? token : variants ? `${variants}:${next}` : next;
}

/** Rewrites every class-like token in `text` (the inside of a class string). */
export function normalizeClasses(text, { z = Z_FLOATING, family, role, custom } = {}) {
	const out = ensureClasses(
		text.replace(/[^\s"'`{}]+/g, (token) => rewriteToken(token, z, family, role, custom)),
		custom
	);
	// plan G7: an item label on glass is at least weight 500 (composited text loses subpixel antialiasing). Added once.
	if (role === 'item' && !/(?:^|\s)font-medium(?=\s|$)/.test(out))
		return out.replace(/(^|\s)text-sm(?=\s|$)/, '$1text-sm font-medium');
	return out;
}

const STRING = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

/** End index (exclusive) of the balanced `open`..`close` group that starts at `from`, skipping strings. */
function balancedEnd(src, from, open, close) {
	let depth = 0;
	for (let i = from; i < src.length; i++) {
		const c = src[i];
		if (c === "'" || c === '"' || c === '`') {
			const re = new RegExp(STRING.source, 'y');
			re.lastIndex = i;
			const m = re.exec(src);
			if (m) i += m[0].length - 1;
		} else if (c === open) depth++;
		else if (c === close && --depth === 0) return i + 1;
	}
	return -1;
}

/** Rewrites the string literals inside a code fragment (the arguments of `cn(…)`, a `class={…}`). */
function rewriteLiterals(code, options) {
	return code.replace(
		STRING,
		(lit) => lit[0] + normalizeClasses(lit.slice(1, -1), options) + lit[0]
	);
}

/**
 * Applies `normalizeClasses` to class strings only: `class="…"`, `class={…}`, and `cn(…)` / `cva(…)`
 * arguments (string literals inside them). Everything else in the file is left as it is.
 */
export function normalizeClassStrings(src, options = {}) {
	const ranges = [];
	for (const m of src.matchAll(/\bclass(?:Name)?=(["'])([^"']*)\1/g)) {
		const start = m.index + m[0].indexOf(m[1]) + 1;
		ranges.push([start, start + m[2].length, 'text']);
	}
	for (const m of src.matchAll(/\bclass(?:Name)?=\{/g)) {
		const open = m.index + m[0].length - 1;
		const end = balancedEnd(src, open, '{', '}');
		if (end > 0) ranges.push([open, end, 'code']);
	}
	for (const m of src.matchAll(/\b(?:cn|cva)\(/g)) {
		const open = m.index + m[0].length - 1;
		const end = balancedEnd(src, open, '(', ')');
		if (end > 0) ranges.push([open, end, 'code']);
	}
	// outermost ranges only (cn() inside class={…} is already covered)
	ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
	let out = '';
	let pos = 0;
	for (const [from, to, kind] of ranges) {
		if (from < pos) continue;
		const piece = src.slice(from, to);
		out +=
			src.slice(pos, from) +
			(kind === 'text' ? normalizeClasses(piece, options) : rewriteLiterals(piece, options));
		pos = to;
	}
	return out + src.slice(pos);
}

/** `import a from 'm'; import type { b } from 'm'` -> one statement per module (named imports only). */
export function mergeImports(src) {
	const re = /^([ \t]*)import (type )?\{([^}]*)\} from '([^']+)';[ \t]*\n?/gm;
	const groups = new Map();
	for (const m of src.matchAll(re)) {
		const members = m[3]
			.split(',')
			.map((x) => x.trim())
			.filter(Boolean)
			.map((x) => (m[2] && !x.startsWith('type ') ? `type ${x}` : x));
		const g = groups.get(m[4]) ?? { indent: m[1], members: [], seen: 0, allType: true };
		if (!m[2]) g.allType = false;
		g.members.push(...members);
		g.seen++;
		groups.set(m[4], g);
	}
	const emitted = new Set();
	return src.replace(re, (whole, indent, _t, _m, mod) => {
		const g = groups.get(mod);
		if (g.seen < 2) return whole;
		if (emitted.has(mod)) return '';
		emitted.add(mod);
		const members = [...new Set(g.members)];
		members.sort((a, b) => Number(a.startsWith('type ')) - Number(b.startsWith('type ')));
		if (g.allType)
			return `${indent}import type { ${members.map((x) => x.replace(/^type /, '')).join(', ')} } from '${mod}';\n`;
		return `${indent}import { ${members.join(', ')} } from '${mod}';\n`;
	});
}

/** `tailwind-variants` -> `class-variance-authority` (`base` string form only). */
export function tvToCva(src, problems = []) {
	if (!/from\s+['"]tailwind-variants['"]/.test(src)) return src;
	if (/slots\s*:/.test(src))
		problems.push('tailwind-variants `slots` is not supported; hand-convert to cva');
	return src
		.replace(/import\s*\{([^}]*)\}\s*from\s*['"]tailwind-variants['"];?/g, (_m, names) => {
			const parts = names
				.split(',')
				.map((x) => x.trim())
				.filter(Boolean);
			const out = [];
			if (parts.some((x) => x === 'tv')) out.push('cva');
			if (parts.some((x) => x.replace(/^type\s+/, '') === 'VariantProps'))
				out.push('type VariantProps');
			return `import { ${out.join(', ')} } from 'class-variance-authority';`;
		})
		.replace(
			/\btv\(\{(\s*)base:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`),/g,
			'cva($2, {$1'
		);
}

// ── whole-file pass ────────────────────────────────────────────────────────

let names;
/** Alpha modifiers that are still there (and not the pinned scrim). */
export function remainingAlpha(src) {
	names ??= colourNames(readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8'));
	return findAlphaModifiers(`${UI_DIR}normalized.svelte`, src, names);
}

/**
 * @param {string} src
 * @param {{ icons?: Set<string>, file?: string }} [options]  `file` picks the layer of a `z-50`
 * @returns {{ out: string, problems: string[] }}
 */
export function normalizeSource(src, { icons = iconExports(), file = '' } = {}) {
	const problems = [];
	let out = src
		.replace(/(['"])(?:\$lib|#lib)\/utils(?:\/cn)?(?:\.js)?\1/g, "'#lib/utils/cn.ts'")
		.replace(/(['"])\$lib\/components\/ui\/([^'"]*?)(?:\/index\.js)?\1/g, (m, _q, rest) =>
			m.includes('/index.js')
				? `'#lib/components/ui/${rest}/index.ts'`
				: `'#lib/components/ui/${rest}'`
		)
		// relative `./x/index.js` -> `./x/index.ts`
		.replace(/(from\s+['"]\.{1,2}\/[^'"]*?)\/index\.js(['"])/g, '$1/index.ts$2')
		.replace(
			/import\s+(\w+)\s+from\s+['"]@lucide\/svelte\/icons\/([\w-]+)['"];?/g,
			(_m, local, slug) => {
				const name = pascal(slug);
				if (!icons.has(name))
					problems.push(`icon ${name} (lucide "${slug}") is not exported by #lib/icons/index.ts`);
				return `import { ${name} as ${local} } from '#lib/icons/index.ts';`;
			}
		);
	out = tvToCva(out, problems);
	out = mergeImports(out);
	out = normalizeClassStrings(out, {
		z: zLayerFor(file),
		family: familyOf(file),
		role: materialRole(file),
		custom: customFor(file)
	});
	const root = reapplyRoot(out, file);
	out = root.out;
	for (const f of remainingAlpha(out))
		problems.push(
			`line ${f.line}: ${f.utility} (alpha on a contrast colour; use an opaque token, only ${[...ALLOWED_ALPHA].join(', ')} may carry alpha)`
		);
	return { out, problems, reapplied: root.applied };
}

// ── hand-written roots ─────────────────────────────────────────────────────

const ROOT_MARKERS = ['createBusyVeto', 'hold?.()', 'onHeld?.()'];

/** `dialog` or `sheet` when `file` is that primitive's root component, else undefined. */
export function handWrittenRoot(file = '') {
	return /ui[^a-z](dialog|sheet)[^a-z](?:dialog|sheet)[.]svelte$/.exec(file)?.[1];
}

/** The stored hand-written root when `out` lost any customisation, else `out` unchanged. */
function reapplyRoot(out, file) {
	const name = handWrittenRoot(file);
	if (!name || ROOT_MARKERS.every((m) => out.includes(m))) return { out, applied: false };
	const stored = join(ROOT, 'scripts/shadcn/overrides', `${name}.svelte.tpl`);
	if (!existsSync(stored)) throw new Error(`the stored hand-written root ${stored} is missing`);
	return { out: readFileSync(stored, 'utf8'), applied: true };
}

// ── CLI ────────────────────────────────────────────────────────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const files = process.argv.slice(2);
	if (files.length === 0) {
		console.error('usage: node scripts/shadcn/normalize.mjs <files…>');
		process.exit(2);
	}
	const icons = iconExports();
	let failed = 0;
	for (const file of files) {
		const before = readFileSync(file, 'utf8');
		const { out, problems, reapplied } = normalizeSource(before, { icons, file });
		if (reapplied)
			console.log(`↻ ${file}: the hand-written root was re-applied (ui/CUSTOMIZATIONS.md)`);
		if (out !== before) writeFileSync(file, out);
		for (const p of problems) {
			failed++;
			console.error(`✗ ${file}: ${p}`);
		}
	}
	if (failed) process.exit(1);
	console.log(`✓ normalized ${files.length} file(s)`);
}
