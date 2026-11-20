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
export const ALLOWED_ALPHA = new Set(['bg-black/50']);
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
//   - GENERATED_UI_FILES             an exact list of files that are unedited CLI output and keep
//                                    shadcn's own `bg-black/50` overlay class (plan G5 replaces them
//                                    with `bg-scrim`; the list then empties)
// Every other file under ui/ is scanned, including the files LeadKart edited inside generated folders.
export const GENERATED_UI_FILES = [
	'src/lib/components/ui/alert-dialog/alert-dialog-overlay.svelte',
	'src/lib/components/ui/dialog/dialog-overlay.svelte',
	'src/lib/components/ui/sheet/sheet-overlay.svelte'
];

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
	for (const pattern of ['src/**/*.svelte', 'src/**/*.ts', 'src/**/*.css', 'src/**/*.html']) {
		for (const rel of globSync(pattern, { cwd: ROOT, exclude: ['src/lib/api/generated/**'] })) {
			const norm = rel.replaceAll('\\', '/');
			const src = readFileSync(join(ROOT, rel), 'utf8');
			if (!pattern.endsWith('.css'))
				for (const f of findAlphaModifiers(norm, src, names)) alphaRefs.push({ file: norm, ...f });
			for (const f of findColorScheme(norm, src)) schemeRefs.push({ file: norm, ...f });
			for (const f of findLegacyTokens(norm, src)) legacyRefs.push({ file: norm, ...f });
			for (const f of findPaletteUtilities(norm, src)) paletteRefs.push({ file: norm, ...f });
		}
	}

	if (
		undefinedRefs.length +
			alphaRefs.length +
			schemeRefs.length +
			legacyRefs.length +
			paletteRefs.length ===
		0
	) {
		console.log(
			`✓ check-tokens: ${globalTokens.size} global token(s) defined, every var(--*) reference resolves; no alpha modifier on a contrast colour in ui/; color-scheme only in theme/semantic.css; no legacy colour name; no raw palette utility.`
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
	process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
