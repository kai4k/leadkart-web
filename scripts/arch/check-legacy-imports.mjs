#!/usr/bin/env node
/**
 * Legacy primitive imports gate (Phase 2 plan Task 16, decisions L17 and L18).
 *
 * Two primitives are being replaced and nothing new may start using them:
 *   - `ui/drawer` (a shim over `ui/sheet` under the old vaul-era names): use `FormSheet` / `Sheet`.
 *   - `ui/data-table` (the hand-rolled table): use `components/data/data-table` (`DataTable`).
 *
 * Fails on an import of `#lib/components/ui/drawer`, `$ui/drawer`, `Drawer` from `$ui` (or the ui barrel),
 * and `#lib/components/ui/data-table`, `$ui/data-table`, `DataTable` / `DataTableColumn` /
 * `DataTableProps` from `$ui`, in a file that is not listed in `allowlists/phase2-rebuild-pending.json`
 * under `drawer` / `legacyDataTable`. Every listed file has a `notes` entry naming the task that
 * removes it; a listed file that no longer imports the primitive (or no longer exists) FAILS, so an
 * entry cannot outlive its reason. Scanned: `src/**`; the two shims themselves and the `ui/` barrel
 * (which defines the exports) are not importers.
 *
 * Exit code: 0 on clean, 1 on a new import or a stale allowlist entry.
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importSpecifiers } from './lib/import-specifiers.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const ALLOWLIST_FILE = 'scripts/arch/allowlists/phase2-rebuild-pending.json';

/** The definitions: not importers. */
export const NOT_IMPORTERS = [
	'src/lib/components/ui/drawer/',
	'src/lib/components/ui/data-table/',
	'src/lib/components/ui/index.ts'
];

const DRAWER_SPECIFIER = /^(?:#lib\/components\/ui|\$ui)\/drawer(?:\/|$)/;
const TABLE_SPECIFIER = /^(?:#lib\/components\/ui|\$ui)\/data-table(?:\/|$)/;
const UI_BARREL_IMPORT =
	/(?:^|[\s;>])import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](?:\$ui|#lib\/components\/ui(?:\/index\.ts)?)['"]/g;
const TABLE_NAMES = new Set(['DataTable', 'DataTableColumn', 'DataTableProps']);

/** @returns {Array<{ line: number, list: 'drawer' | 'legacyDataTable', what: string }>} */
export function findLegacyImports(rel, src) {
	const norm = rel.replaceAll('\\', '/');
	if (!norm.startsWith('src/') || NOT_IMPORTERS.some((p) => norm.startsWith(p))) return [];
	const found = [];
	for (const { line, specifier } of importSpecifiers(src)) {
		if (DRAWER_SPECIFIER.test(specifier)) found.push({ line, list: 'drawer', what: specifier });
		else if (TABLE_SPECIFIER.test(specifier))
			found.push({ line, list: 'legacyDataTable', what: specifier });
	}
	const blank = (/** @type {string} */ m) => m.replace(/[^\n]/g, ' ');
	const text = src
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/<!--[\s\S]*?-->/g, blank)
		.replace(/^[ \t]*\/\/.*$/gm, blank);
	for (const m of text.matchAll(UI_BARREL_IMPORT)) {
		const line = text.slice(0, m.index + m[0].indexOf('import')).split('\n').length;
		for (const part of m[1].split(',')) {
			const name = part
				.trim()
				.replace(/^type\s+/, '')
				.split(/\s+as\s+/)[0]
				.trim();
			if (name === 'Drawer') found.push({ line, list: 'drawer', what: `${name} from $ui` });
			else if (TABLE_NAMES.has(name))
				found.push({ line, list: 'legacyDataTable', what: `${name} from $ui` });
		}
	}
	return found;
}

/**
 * @param {{ drawer: string[], legacyDataTable: string[], notes?: Record<string, string>, counts?: Record<string, Record<string, number>> }} allowlist
 * @param {Map<string, string>} files path -> source
 * @returns {{ violations: string[], stale: string[] }}
 */
export function checkLegacyImports(allowlist, files) {
	const violations = [];
	const used = { drawer: new Set(), legacyDataTable: new Set() };
	for (const [path, src] of files) {
		const hits = findLegacyImports(path, src);
		for (const list of /** @type {const} */ (['drawer', 'legacyDataTable'])) {
			const n = hits.filter((h) => h.list === list).length;
			const cap = allowlist.counts?.[list]?.[path];
			if (n > 0 && allowlist[list].includes(path) && cap !== undefined && n > cap)
				violations.push(
					`${path}: ${n} ${list} import(s), the allowlist records ${cap}: an entry only shrinks`
				);
			if (n > 0 && allowlist[list].includes(path) && allowlist.counts && cap === undefined)
				violations.push(`${path}: listed in ${list} without a count (counts.${list})`);
		}
		for (const hit of hits) {
			if (allowlist[hit.list].includes(path)) used[hit.list].add(path);
			else violations.push(`${path}:${hit.line}  ${hit.what}  (${hit.list})`);
		}
	}
	const stale = [];
	for (const list of /** @type {const} */ (['drawer', 'legacyDataTable']))
		for (const p of allowlist[list])
			if (!used[list].has(p))
				stale.push(
					`${p}: listed in ${list} but ${files.has(p) ? 'no longer imports it' : 'does not exist'}; remove the entry`
				);
	return { violations, stale };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	const allowlist = JSON.parse(readFileSync(join(ROOT, ALLOWLIST_FILE), 'utf8'));
	const paths = globSync('src/**/*.{svelte,ts}', { cwd: ROOT }).map((p) => p.replaceAll('\\', '/'));
	const files = new Map(paths.map((p) => [p, readFileSync(join(ROOT, p), 'utf8')]));
	const { violations, stale } = checkLegacyImports(allowlist, files);
	// a path that is not a file at all is also a stale entry (never silently skipped)
	for (const p of [...allowlist.drawer, ...allowlist.legacyDataTable])
		if (!existsSync(join(ROOT, p)) && !stale.some((s) => s.startsWith(`${p}:`)))
			stale.push(`${p}: does not exist; remove the entry`);
	if (violations.length + stale.length === 0) {
		console.log(
			`✓ check-legacy-imports: ${files.size} file(s); ui/drawer and ui/data-table are imported only by the ${allowlist.drawer.length} + ${allowlist.legacyDataTable.length} rebuild-pending file(s).`
		);
		process.exit(0);
	}
	if (violations.length) {
		console.error(`✗ check-legacy-imports: ${violations.length} legacy import(s):\n`);
		for (const v of violations) console.error(`  ${v}`);
		console.error(
			'\nFix: FormSheet / Sheet instead of Drawer; components/data/data-table instead of ui/data-table.'
		);
	}
	for (const s of stale) console.error(`✗ check-legacy-imports: ${s}`);
	process.exit(1);
}
