#!/usr/bin/env node
/**
 * Raw form and table elements gate (Phase 2 plan Task 16, decision L27).
 *
 * `<table>`, `<textarea>`, `<select>` and `<input>` (unless `type="hidden"`) are written ONLY inside
 * the shared primitives (`ui/`, `form/`, `data/`). A feature or a route composes `Input`, `Textarea`,
 * `SelectField`, `DataTable`..., so the field anatomy, the tokens and the a11y wiring live in one
 * place. Scanned: `src/lib/features/**\/*.svelte` and `src/routes/**\/*.svelte`.
 *
 * Files that wait for their rebuild are listed in `allowlists/phase2-rebuild-pending.json` under
 * `rawElements`, each with a `notes` entry naming the task that removes it. A listed file that no
 * longer exists, or no longer has a raw element, FAILS: an entry cannot outlive its reason.
 *
 * Exit code: 0 on clean, 1 on a raw element outside the allowlist or a stale allowlist entry.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const ALLOWLIST_FILE = 'scripts/arch/allowlists/phase2-rebuild-pending.json';
export const SCAN_GLOBS = ['src/lib/features/**/*.svelte', 'src/routes/**/*.svelte'];

const RAW = /<(table|textarea|select|input)(?=[\s/>])/g;

/** Text with comments, <script> and <style> blanked (newlines kept), so only markup is read. */
function markupOnly(src) {
	const blank = (m) => m.replace(/[^\n]/g, ' ');
	return src
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/<script\b[\s\S]*?<\/script>/g, blank)
		.replace(/<style\b[\s\S]*?<\/style>/g, blank);
}

/** The opening tag starting at `start`: ends at the first `>` outside quotes and `{...}`. */
function openingTag(src, start) {
	let depth = 0;
	let quote = '';
	for (let i = start; i < src.length; i++) {
		const c = src[i];
		if (quote) {
			if (c === quote) quote = '';
		} else if (c === '"' || c === "'") quote = c;
		else if (c === '{') depth++;
		else if (c === '}') depth--;
		else if (c === '>' && depth <= 0) return src.slice(start, i + 1);
	}
	return src.slice(start);
}

/** @returns {Array<{ line: number, element: string }>} */
export function findRawElements(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!norm.endsWith('.svelte')) return [];
	if (!norm.startsWith('src/lib/features/') && !norm.startsWith('src/routes/')) return [];
	const text = markupOnly(src);
	const found = [];
	for (const m of text.matchAll(RAW)) {
		const element = m[1];
		if (element === 'input' && /\btype\s*=\s*["']hidden["']/.test(openingTag(text, m.index)))
			continue;
		found.push({ line: text.slice(0, m.index).split('\n').length, element });
	}
	return found;
}

/**
 * @param {{ rawElements: string[], counts?: { rawElements?: Record<string, number> } }} allowlist
 * @param {Map<string, string>} files path -> source (the scanned files)
 * @returns {{ violations: string[], stale: string[] }}
 */
export function checkRawElements(allowlist, files) {
	const allowed = new Set(allowlist.rawElements);
	const violations = [];
	const used = new Set();
	for (const [path, src] of files) {
		const hits = findRawElements(path, src);
		if (hits.length === 0) continue;
		if (allowed.has(path)) {
			used.add(path);
			const cap = allowlist.counts?.rawElements?.[path];
			if (allowlist.counts && cap === undefined)
				violations.push(`${path}: listed in rawElements without a count (counts.rawElements)`);
			else if (cap !== undefined && hits.length > cap)
				violations.push(
					`${path}: ${hits.length} raw element(s), the allowlist records ${cap}: an entry only shrinks`
				);
		} else for (const h of hits) violations.push(`${path}:${h.line}  <${h.element}>`);
	}
	const stale = [...allowed]
		.filter((p) => !used.has(p))
		.map((p) =>
			files.has(p)
				? `${p}: listed in rawElements but has no raw element any more; remove the entry`
				: `${p}: listed in rawElements but the file does not exist; remove the entry`
		);
	return { violations, stale };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const allowlist = JSON.parse(readFileSync(join(ROOT, ALLOWLIST_FILE), 'utf8'));
	const paths = SCAN_GLOBS.flatMap((g) => globSync(g, { cwd: ROOT })).map((p) =>
		p.replaceAll('\\', '/')
	);
	const files = new Map(paths.map((p) => [p, readFileSync(join(ROOT, p), 'utf8')]));
	for (const p of allowlist.rawElements) if (!existsSync(join(ROOT, p))) files.delete(p);
	const { violations, stale } = checkRawElements(allowlist, files);
	if (violations.length + stale.length === 0) {
		console.log(
			`✓ check-raw-elements: ${files.size} feature/route file(s); no raw <table>/<textarea>/<select>/<input> outside the ${allowlist.rawElements.length} rebuild-pending file(s).`
		);
		process.exit(0);
	}
	if (violations.length) {
		console.error(`✗ check-raw-elements: ${violations.length} raw element(s):\n`);
		for (const v of violations) console.error(`  ${v}`);
		console.error(
			'\nFix: compose the primitive (Input, Textarea, SelectField, DataTable, ...). Only a file that waits for its rebuild may be listed in the allowlist, with the task that removes it.'
		);
	}
	for (const s of stale) console.error(`✗ check-raw-elements: ${s}`);
	process.exit(1);
}
