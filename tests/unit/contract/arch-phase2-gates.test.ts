import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	GENERATED_UI_FILES,
	findLegacyTokens,
	findPaletteUtilities
} from '../../../scripts/arch/check-tokens.mjs';
import { checkRawElements, findRawElements } from '../../../scripts/arch/check-raw-elements.mjs';
import {
	checkLegacyImports,
	findLegacyImports
} from '../../../scripts/arch/check-legacy-imports.mjs';

/** Self-tests of the Task 16 gates: one synthetic offender per rule, and what must NOT be flagged. */

const FEATURE = 'src/lib/features/x/components/X.svelte';
const names = (list: Array<{ name?: string; utility?: string; element?: string }>) =>
	list.map((f) => f.name ?? f.utility ?? f.element);

describe('check-tokens: legacy colour names', () => {
	it.each([
		['--color-bg-elevated', 'a:b { background: var(--color-bg-elevated); }'],
		['--color-fg-muted', '.x { color: var(--color-fg-muted); }'],
		['--color-brand-500', '.x { color: var(--color-brand-500); }'],
		['--color-border-strong', '--color-border-strong: red;'],
		['--color-focus-ring', 'outline: 2px solid var(--color-focus-ring);'],
		['--color-primary-fg', 'color: var(--color-primary-fg);'],
		['--color-primary-active', 'color: var(--color-primary-active);'],
		['--color-gray-500', 'color: var(--color-gray-500);'],
		['--color-success-600', 'color: var(--color-success-600);'],
		['--color-secondary-500', 'color: var(--color-secondary-500);'],
		['--color-logo-purple', 'color: var(--color-logo-purple);'],
		['--glass-bg', 'background: var(--glass-bg);'],
		['glass-heading', 'aria-labelledby="glass-heading"'],
		['--lk-touch-target-min', 'min-height: var(--lk-touch-target-min);'],
		['--brand-600', '--brand-600: var(--primary-solid);']
	])('flags %s', (name, src) => {
		expect(names(findLegacyTokens('src/lib/x/X.svelte', src))).toContain(name);
	});

	it('does not flag the semantic names, the Phase 2 bridge or other glass words', () => {
		const ok = [
			'var(--background) var(--card) var(--muted-foreground) var(--primary-hover)',
			'--color-primary-hover: var(--primary-hover);',
			'--color-secondary: var(--secondary); --color-secondary-foreground: x;',
			'--color-success: var(--success); --color-success-soft: x;',
			'<Card surface="glass">',
			'var(--palette-gray-500) var(--neutral-default-950) var(--swatch-sidebar-dark)'
		].join('\n');
		expect(findLegacyTokens('src/lib/x/X.svelte', ok)).toEqual([]);
	});

	it('exempts only the palette file, and only src/ is scanned', () => {
		const src = '--color-bg: red;';
		expect(findLegacyTokens('src/styles/theme/palettes.css', src)).toEqual([]);
		expect(findLegacyTokens('tests/x.ts', src)).toEqual([]);
		expect(findLegacyTokens('src/styles/tokens.css', src)).toHaveLength(1);
		expect(findLegacyTokens('src/styles/theme/semantic.css', src)).toHaveLength(1);
	});

	it('reports the line', () => {
		expect(findLegacyTokens('src/a.css', 'a\nb\n.x { color: var(--color-fg); }')[0].line).toBe(3);
	});
});

describe('check-tokens: raw palette utilities', () => {
	it.each([
		'text-gray-500',
		'bg-red-50',
		'border-brand-200',
		'text-white',
		'bg-black/50',
		'hover:bg-slate-100',
		'dark:text-zinc-200',
		'ring-success-500',
		'border-danger-300',
		'bg-secondary-100',
		'text-logo-purple',
		'from-violet-500',
		'border-s-amber-400'
	])('flags %s', (cls) => {
		expect(
			names(findPaletteUtilities('src/lib/features/x/X.svelte', `<i class="a ${cls} b">`))
		).toEqual([cls]);
	});

	it('does not flag the semantic utilities', () => {
		const ok =
			'text-muted-foreground bg-destructive-soft text-primary-foreground bg-foreground/10 bg-secondary text-secondary-foreground bg-success text-success border-warning-border text-info bg-card border-border ring-ring text-subtle-foreground fill-current';
		expect(findPaletteUtilities('src/lib/features/x/X.svelte', `<i class="${ok}">`)).toEqual([]);
	});

	it('scans the LeadKart composites in ui/, and exempts only the pinned generated folders and src/styles', () => {
		const cls = '<i class="text-white">';
		for (const p of [
			'src/lib/components/ui/AuthCard.svelte',
			'src/lib/components/ui/kanban/K.svelte',
			'src/lib/components/ui/stepper/S.svelte',
			'src/lib/components/ui/timeline/T.svelte',
			'src/lib/components/ui/spinner/S.svelte',
			'src/lib/components/ui/data-table/D.svelte',
			'src/lib/components/form/F.svelte',
			'src/lib/layouts/L.svelte'
		])
			expect(findPaletteUtilities(p, cls), p).toHaveLength(1);
		for (const file of GENERATED_UI_FILES)
			expect(findPaletteUtilities(file, cls), file).toEqual([]);
		expect(findPaletteUtilities('src/styles/x.css', cls)).toEqual([]);
		// the folder is no longer exempt: another file in the same folder, and a LeadKart-edited one, are scanned
		expect(
			findPaletteUtilities('src/lib/components/ui/dialog/dialog-content.svelte', cls)
		).toHaveLength(1);
		expect(
			findPaletteUtilities('src/lib/components/ui/radio-group/radio-group-tile.svelte', cls)
		).toHaveLength(1);
	});

	it('pins exact files that exist on disk (no directory-wide exemption)', () => {
		for (const f of GENERATED_UI_FILES) {
			expect(f.endsWith('.svelte') && f.startsWith('src/lib/components/ui/'), f).toBe(true);
			expect(existsSync(f), f).toBe(true);
		}
		expect(new Set(GENERATED_UI_FILES).size).toBe(GENERATED_UI_FILES.length);
	});
});

describe('check-raw-elements', () => {
	it.each([
		['table', '<table><tr></tr></table>'],
		['textarea', '<textarea bind:value={x}></textarea>'],
		['select', '<select><option>a</option></select>'],
		['input', '<input type="text" bind:value={x} />']
	])('flags a raw <%s> in a feature and in a route', (element, src) => {
		expect(names(findRawElements(FEATURE, src))).toEqual([element]);
		expect(names(findRawElements('src/routes/(app)/x/+page.svelte', src))).toEqual([element]);
	});

	it('allows a hidden input, even with a dynamic value and an arrow in an attribute', () => {
		expect(
			findRawElements(FEATURE, '<input type="hidden" name="a" value={x > 1 ? 1 : 2} />')
		).toEqual([]);
		expect(findRawElements(FEATURE, '<input\n\ttype=\'hidden\'\n\tname="a"\n/>')).toEqual([]);
		expect(names(findRawElements(FEATURE, '<input type={kind} />'))).toEqual(['input']);
	});

	it('ignores comments, script and style text, and component names that merely start alike', () => {
		const src =
			'<!-- <table> -->\n<script>const s = "<textarea>";</script>\n<style>/* <select> */</style>\n<InputField /><TableRow /><Select.Root />';
		expect(findRawElements(FEATURE, src)).toEqual([]);
	});

	it('scans features and routes only, and .svelte only', () => {
		const src = '<table></table>';
		expect(findRawElements('src/lib/components/form/F.svelte', src)).toEqual([]);
		expect(findRawElements('src/lib/components/ui/table/t.svelte', src)).toEqual([]);
		expect(findRawElements('src/lib/features/x/x.ts', src)).toEqual([]);
	});

	it('reports the line', () => {
		expect(findRawElements(FEATURE, '<div>\n</div>\n<table></table>')[0].line).toBe(3);
	});

	it('an allowlisted file passes; a stale or missing entry fails', () => {
		const files = new Map([
			[FEATURE, '<table></table>'],
			['src/lib/features/x/components/Clean.svelte', '<div></div>']
		]);
		expect(checkRawElements({ rawElements: [FEATURE] }, files)).toEqual({
			violations: [],
			stale: []
		});
		const missing = checkRawElements({ rawElements: [] }, files);
		expect(missing.violations).toEqual([`${FEATURE}:1  <table>`]);
		const stale = checkRawElements(
			{ rawElements: [FEATURE, 'src/lib/features/x/components/Clean.svelte', 'src/gone.svelte'] },
			files
		);
		expect(stale.stale).toHaveLength(2);
		expect(stale.stale.join('\n')).toContain(
			'Clean.svelte: listed in rawElements but has no raw element'
		);
		expect(stale.stale.join('\n')).toContain(
			'src/gone.svelte: listed in rawElements but the file does not exist'
		);
	});
});

describe('check-legacy-imports', () => {
	const svelte = (script: string) => `<script lang="ts">\n${script}\n</script>`;
	it.each([
		["import * as Drawer from '#lib/components/ui/drawer/index.ts';", 'drawer'],
		["import { DrawerContent } from '$ui/drawer';", 'drawer'],
		["import { Drawer, Button } from '$ui';", 'drawer'],
		["import { Button, Drawer as D } from '#lib/components/ui/index.ts';", 'drawer'],
		["import { DataTable } from '$ui';", 'legacyDataTable'],
		["import { type DataTableColumn, Badge } from '$ui';", 'legacyDataTable'],
		["import DataTable from '#lib/components/ui/data-table/DataTable.svelte';", 'legacyDataTable'],
		[
			"import type { DataTableColumn } from '#lib/components/ui/data-table/index.ts';",
			'legacyDataTable'
		]
	])('flags %s', (line, list) => {
		const hits = findLegacyImports(FEATURE, svelte(line));
		expect(hits.map((h: { list: string }) => h.list)).toEqual([list]);
		expect(hits[0].line).toBe(2);
	});

	it('does not flag other imports, the new data-table, or text in a comment or string', () => {
		const ok = svelte(
			[
				"import { Button, Sheet, Dialog } from '$ui';",
				"import { DataTable } from '#lib/components/data/data-table/index.ts';",
				"// import { Drawer } from '$ui';",
				'const s = "import { Drawer } from \'$ui\'";'
			].join('\n')
		);
		expect(findLegacyImports(FEATURE, ok)).toEqual([]);
	});

	it('the shims and the barrel are definitions, not importers', () => {
		const src = "import { Drawer } from '$ui';";
		expect(findLegacyImports('src/lib/components/ui/drawer/drawer.svelte', src)).toEqual([]);
		expect(findLegacyImports('src/lib/components/ui/data-table/DataTable.svelte', src)).toEqual([]);
		expect(findLegacyImports('src/lib/components/ui/index.ts', src)).toEqual([]);
		expect(findLegacyImports('tests/unit/x.ts', src)).toEqual([]);
	});

	it('an allowlisted importer passes; a new one, a stale one and a missing one fail', () => {
		const importer = svelte("import { Drawer } from '$ui';");
		const files = new Map([
			[FEATURE, importer],
			['src/lib/features/x/components/Clean.svelte', svelte("import { Button } from '$ui';")]
		]);
		const base = { drawer: [FEATURE], legacyDataTable: [] as string[] };
		expect(checkLegacyImports(base, files)).toEqual({ violations: [], stale: [] });
		expect(checkLegacyImports({ ...base, drawer: [] }, files).violations).toHaveLength(1);
		const stale = checkLegacyImports(
			{
				drawer: [FEATURE, 'src/lib/features/x/components/Clean.svelte'],
				legacyDataTable: ['src/gone.svelte']
			},
			files
		);
		expect(stale.stale.join('\n')).toContain(
			'Clean.svelte: listed in drawer but no longer imports it'
		);
		expect(stale.stale.join('\n')).toContain(
			'src/gone.svelte: listed in legacyDataTable but does not exist'
		);
		// listing it under the wrong list does not excuse it
		expect(
			checkLegacyImports({ drawer: [], legacyDataTable: [FEATURE] }, files).violations
		).toHaveLength(1);
	});
});

describe('the rebuild-pending allowlist', () => {
	const list = JSON.parse(
		readFileSync('scripts/arch/allowlists/phase2-rebuild-pending.json', 'utf8')
	) as {
		rawElements: string[];
		drawer: string[];
		legacyDataTable: string[];
		notes: Record<string, string>;
	};

	it('has the planned shape, sorted, with a note for every entry naming its task', () => {
		expect(Object.keys(list).sort()).toEqual([
			'counts',
			'drawer',
			'legacyDataTable',
			'notes',
			'rawElements'
		]);
		const all = new Set([...list.rawElements, ...list.drawer, ...list.legacyDataTable]);
		expect(Object.keys(list.notes).sort()).toEqual([...all].sort());
		for (const p of all) {
			expect(list.notes[p], p).toMatch(
				/^\/\/ removed by (Task \d+|the leads\/orders\/inventory rebuild \(plan section 9\))$/
			);
		}
	});

	it('lists only files that exist under the pending areas (never a path outside them)', () => {
		const stable = /Task (18|19|20|21|22|23|24|25|26|27)$/;
		for (const [p, note] of Object.entries(list.notes)) {
			const rebuild =
				/features\/(leads|orders|inventory)\//.test(p) ||
				/routes\/\(app\)\/(leads|orders|inventory)\//.test(p) ||
				p === 'src/lib/components/data/BulkUploadDrawer.svelte';
			expect(rebuild || stable.test(note), p).toBe(true);
		}
	});
});

describe('the rebuild-pending allowlist only shrinks', () => {
	type Lists = 'rawElements' | 'drawer' | 'legacyDataTable';
	const list = JSON.parse(
		readFileSync('scripts/arch/allowlists/phase2-rebuild-pending.json', 'utf8')
	) as Record<Lists, string[]> & {
		counts: Record<Lists, Record<string, number>>;
	};
	const names: Lists[] = ['rawElements', 'drawer', 'legacyDataTable'];

	it('every entry records the count it has today, and no count is orphaned', () => {
		for (const n of names) {
			expect(Object.keys(list.counts[n]).sort(), n).toEqual([...list[n]].sort());
			for (const c of Object.values(list.counts[n])) expect(c).toBeGreaterThan(0);
		}
	});

	/**
	 * The ceiling is pinned HERE, as literals, not in the JSON: raising a count in the allowlist and the ceiling
	 * together cannot pass any more, because the number below is in the test. When a task migrates a file,
	 * lower these two (entries, then occurrences); never raise them.
	 */
	const PINNED = { entries: 23, total: 34 };

	it('the ceiling is exact: lower it when a task migrates a file (ratchet down)', () => {
		const entries = names.reduce((a, n) => a + list[n].length, 0);
		const total = names.reduce(
			(a, n) => a + Object.values(list.counts[n]).reduce((x, y) => x + y, 0),
			0
		);
		expect(entries, `${entries} entries: lower PINNED.entries to ${entries}`).toBe(PINNED.entries);
		expect(total, `${total} occurrences: lower PINNED.total to ${total}`).toBe(PINNED.total);
		expect(list).not.toHaveProperty('ceiling');
	});

	it('a listed file that gains a raw element fails, one at its recorded count passes', () => {
		const path = 'src/lib/features/x/A.svelte';
		const allow = { rawElements: [path], counts: { rawElements: { [path]: 1 } } };
		expect(checkRawElements(allow, new Map([[path, '<input /><p></p>']])).violations).toEqual([]);
		const grown = checkRawElements(
			allow,
			new Map([[path, '<input /><textarea></textarea>']])
		).violations;
		expect(grown).toHaveLength(1);
		expect(grown[0]).toContain('only shrinks');
		const bare = { rawElements: [path], counts: { rawElements: {} } };
		expect(checkRawElements(bare, new Map([[path, '<input />']])).violations[0]).toContain(
			'without a count'
		);
	});

	it('a listed file that gains a legacy import fails', () => {
		const path = 'src/lib/features/x/B.svelte';
		const one = "import { Drawer } from '$ui';";
		const two = "import { Drawer } from '$ui';\nimport D from '$ui/drawer';";
		const allow = {
			drawer: [path],
			legacyDataTable: [],
			counts: { drawer: { [path]: 1 }, legacyDataTable: {} }
		};
		expect(checkLegacyImports(allow, new Map([[path, one]])).violations).toEqual([]);
		expect(checkLegacyImports(allow, new Map([[path, two]])).violations[0]).toContain(
			'only shrinks'
		);
	});
});
