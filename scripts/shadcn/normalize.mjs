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
 *   6. FAILS on any `/<alpha>` modifier left on a text, ring, border-input or solid-fill colour
 *      (the same rule as the `check-tokens` arch gate; the only alpha allowed is `bg-black/50`)
 *
 * Idempotent: a second run changes nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
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
	// the overlay scrim: the one pinned decorative alpha
	[/^bg-black\/10$/, 'bg-black/50'],
	// secondary text: the muted token, not the foreground at 60%
	[/^text-foreground\/60$/, 'text-muted-foreground'],
	// nova style hook (no CSS behind it in this repo): flip the chevron in RTL
	[/^cn-rtl-flip$/, 'rtl:rotate-180']
];

/** Invalid-state ring/border alphas on a control: dropped (the control shows `aria-invalid` through its own border token). */
const DROP = [{ variants: /aria-invalid/, utility: /^(?:ring|border)-destructive\/\d+$/ }];

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

function rewriteToken(token) {
	const [variants, utility] = splitVariants(token);
	if (DROP.some((d) => d.variants.test(variants) && d.utility.test(utility))) return '';
	let next = utility;
	for (const [re, to, when] of OPAQUE) {
		if (re.test(next) && (!when || when.test(variants))) {
			next = to;
			break;
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

/** Rewrites every class-like token in `text` (class strings, `cn(...)` arguments). */
export function normalizeClasses(text) {
	return text.replace(/[^\s"'`{}]+/g, rewriteToken);
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

// ── whole-file pass ────────────────────────────────────────────────────────

let names;
/** Alpha modifiers that are still there (and not the pinned scrim). */
export function remainingAlpha(src) {
	names ??= colourNames(readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8'));
	return findAlphaModifiers(`${UI_DIR}normalized.svelte`, src, names);
}

/**
 * @param {string} src
 * @param {{ icons?: Set<string> }} [options]
 * @returns {{ out: string, problems: string[] }}
 */
export function normalizeSource(src, { icons = iconExports() } = {}) {
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
	out = mergeImports(out);
	out = normalizeClasses(out);
	for (const f of remainingAlpha(out))
		problems.push(
			`line ${f.line}: ${f.utility} (alpha on a contrast colour; use an opaque token, only ${[...ALLOWED_ALPHA].join(', ')} may carry alpha)`
		);
	return { out, problems };
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
		const { out, problems } = normalizeSource(before, { icons });
		if (out !== before) writeFileSync(file, out);
		for (const p of problems) {
			failed++;
			console.error(`✗ ${file}: ${p}`);
		}
	}
	if (failed) process.exit(1);
	console.log(`✓ normalized ${files.length} file(s)`);
}
