#!/usr/bin/env node
/**
 * Form-submit canon gate (Layer D of Session 0 — UI canon rebuild).
 *
 * Every `<Button type="submit">` (or `<button type="submit">`) inside a
 * `<form>` MUST be a descendant of an element with `class="form-footer"`
 * (or that includes `form-footer` in its class list).
 *
 * Why this exists:
 *   - The `<form class="stack">` (flex-column with `align-items: stretch`)
 *     causes any direct-child Button to stretch full-width — breaks the
 *     canonical "submit button right-aligned on desktop, full-width on
 *     mobile" pattern that every other form ships with.
 *   - Real bug: ChangeEmailForm's submit button stretched full-width
 *     while ChangePasswordForm's didn't, because the former wasn't
 *     wrapped. ESLint can't catch this; arch gates can.
 *
 * The canonical wrapper is `.form-footer` (defined in src/styles/layout.css).
 * Pre-existing forms using the inline `flex flex-col gap-2 sm:flex-row
 * sm:justify-end` recipe are ALSO accepted during the migration window —
 * the gate matches either form. Once Session 3 (Forms canon) ships,
 * `.form-footer` becomes the only accepted form.
 *
 * Exit code: 0 on clean, 1 on any submit button without a canonical wrapper.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

// Canonical submit-button containers — four accepted patterns:
//
//   1. `.form-footer`            — preferred (src/styles/layout.css class)
//   2. `sm:justify-end`           — legacy inline Tailwind pattern (kept
//                                   during Session 0→3 migration window)
//   3. `<Button fullWidth>`       — AuthCard pattern (signin/forgot/reset).
//                                   Single-action surfaces intentionally
//                                   render a full-width button — that IS
//                                   the canon for narrow card forms.
//   4. `<Drawer.Footer>` / `<Dialog.Footer>` — primitive slots already
//                                   bake in `justify-end` + border-top.
//                                   Buttons inside these slots are
//                                   correctly right-aligned without an
//                                   extra wrapper.
//
// In Session 3 (Forms canon), patterns 2 + 3 may tighten to require an
// explicit `<FormFooter>` primitive call. Today, the four-pattern
// allowance reflects the in-flight migration.
const CLASS_WRAPPERS = ['form-footer', 'sm:justify-end'];
const SLOT_WRAPPERS = ['<Drawer.Footer', '<Dialog.Footer', '<DrawerFooter', '<DialogFooter'];

// Submit-button patterns. Match Svelte template `<Button>` (primitive)
// AND raw HTML `<button>`. Heuristic: looking for `type="submit"` near
// the element opening; capture the entire opening tag so the gate can
// inspect attributes like `fullWidth`.
const SUBMIT_PATTERNS = [
	/<Button[^>]*\stype=["']submit["'][^>]*>/,
	/<button[^>]*\stype=["']submit["'][^>]*>/
];

function findSubmitButtons(src) {
	const hits = [];
	for (const re of SUBMIT_PATTERNS) {
		const global = new RegExp(re.source, 'g');
		for (const m of src.matchAll(global)) {
			const lineNo = src.slice(0, m.index).split('\n').length;
			hits.push({ line: lineNo, index: m.index, tag: m[0] });
		}
	}
	return hits;
}

function hasFullWidthAttr(tag) {
	// Matches the prop forms Svelte 5 accepts:
	//   fullWidth         (shorthand boolean true)
	//   fullWidth={true}
	//   fullWidth="true"
	return /\sfullWidth(?:\s|=|>|\/)/.test(tag);
}

// Walk back up the source from the submit button's position, looking
// for the nearest enclosing canonical wrapper. Search bounded by the
// enclosing `<form>` tag — the wrapper must be inside the form, not
// outside.
function hasCanonicalWrapper(src, submitIndex, submitTag) {
	if (hasFullWidthAttr(submitTag)) return true;

	const ctxStart = Math.max(0, submitIndex - 4000);
	const ctx = src.slice(ctxStart, submitIndex);
	const formOpenIdx = ctx.lastIndexOf('<form');
	const searchStart = formOpenIdx >= 0 ? formOpenIdx : 0;
	const formCtx = ctx.slice(searchStart);

	// (a) class attribute containing form-footer / sm:justify-end
	const classMatches = [...formCtx.matchAll(/class=(?:["']|\{['"`])([^"'`]*)/g)];
	for (const cm of classMatches) {
		if (CLASS_WRAPPERS.some((c) => cm[1].includes(c))) return true;
	}
	// (b) class={cn(...)} composition containing one of the canon strings
	const cnMatches = [...formCtx.matchAll(/class=\{cn\([^)]+\)\}/g)];
	for (const m of cnMatches) {
		if (CLASS_WRAPPERS.some((c) => m[0].includes(c))) return true;
	}
	// (c) <Drawer.Footer> / <Dialog.Footer> primitive slot wrapping the button
	for (const slot of SLOT_WRAPPERS) {
		if (formCtx.includes(slot)) return true;
	}
	return false;
}

// Only scan files that contain a <form. Saves time over scanning all
// .svelte files.
const files = globSync('src/**/*.svelte', { cwd: ROOT });

const violations = [];
let formsScanned = 0;

for (const rel of files) {
	const abs = join(ROOT, rel);
	const src = readFileSync(abs, 'utf8');
	if (!src.includes('<form')) continue;
	const submits = findSubmitButtons(src);
	if (submits.length === 0) continue;
	formsScanned += 1;
	for (const submit of submits) {
		if (!hasCanonicalWrapper(src, submit.index, submit.tag)) {
			violations.push({
				file: rel.replaceAll('\\', '/'),
				line: submit.line
			});
		}
	}
}

if (violations.length === 0) {
	console.log(
		`✓ check-form-submit-canon: ${formsScanned} form(s) scanned, all submit buttons wrapped in .form-footer or sm:justify-end.`
	);
	process.exit(0);
}

console.error(
	`✗ check-form-submit-canon: ${violations.length} submit button(s) without canonical wrapper:\n`
);
for (const v of violations) console.error(`  ${v.file}:${v.line}`);
console.error(
	'\nFix: wrap the submit button in `<div class="form-footer">…</div>`. The class is defined in src/styles/layout.css and provides the canon footer layout (mobile-stacked → desktop right-aligned). The transitional pattern `class="flex flex-col gap-2 sm:flex-row sm:justify-end"` is also accepted during Session 0→3 migration window.'
);
process.exit(1);
