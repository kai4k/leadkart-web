import { describe, expect, it } from 'vitest';
import { findViolations as bitsViolations } from '../../../scripts/arch/check-bits-ui-boundary.mjs';
import {
	findImportViolations,
	findManifestViolations
} from '../../../scripts/arch/check-banned-packages.mjs';
import { importSpecifiers } from '../../../scripts/arch/lib/import-specifiers.mjs';

/** Self-test of the two import gates: fixtures, not the repository. */
const FORM = 'src/lib/components/form/X.svelte';
const UI = 'src/lib/components/ui/dialog/dialog.svelte';
const svelte = (script: string) => `<script lang="ts">\n${script}\n</script>\n`;

describe('import-specifiers', () => {
	it.each([
		["import { Dialog } from 'bits-ui';", 'bits-ui'],
		["import type { DateValue } from '@internationalized/date';", '@internationalized/date'],
		["import * as P from 'bits-ui/x';", 'bits-ui/x'],
		["export { Calendar } from 'bits-ui';", 'bits-ui'],
		["import 'bits-ui';", 'bits-ui'],
		["const m = await import('bits-ui');", 'bits-ui'],
		["import {\n a,\n b\n} from 'bits-ui';", 'bits-ui']
	])('reads %j', (src, specifier) => {
		expect(importSpecifiers(src).map((i) => i.specifier)).toEqual([specifier]);
	});

	it('ignores comments and text that only mentions a package', () => {
		expect(importSpecifiers("// import x from 'bits-ui'")).toEqual([]);
		expect(importSpecifiers("/* import x from 'bits-ui' */")).toEqual([]);
		expect(importSpecifiers("<!-- import x from 'bits-ui' -->")).toEqual([]);
		expect(importSpecifiers('const s = "import x from \'bits-ui\'";')).toEqual([]);
		expect(importSpecifiers("const note = 'bits-ui';")).toEqual([]);
	});

	it('reports the line of the import', () => {
		expect(importSpecifiers("const a = 1;\n\nimport x from 'm';")[0]?.line).toBe(3);
	});
});

describe('check-bits-ui-boundary', () => {
	it.each([
		['a .ts file', 'src/lib/features/x/api.ts', "import { Dialog } from 'bits-ui';"],
		['a form component', FORM, svelte("import { Combobox } from 'bits-ui';")],
		['a type-only import', FORM, svelte("import type { DateRange } from 'bits-ui';")],
		['a subpath', FORM, svelte("import { x } from 'bits-ui/internal';")],
		['a dynamic import', 'src/routes/x.ts', "const m = await import('bits-ui');"],
		['a re-export', 'src/lib/x/index.ts', "export { Tabs } from 'bits-ui';"],
		['a test', 'tests/unit/x.test.ts', "import { Dialog } from 'bits-ui';"],
		[
			'a story',
			'src/lib/components/form/X.stories.svelte',
			svelte("import { Select } from 'bits-ui';")
		],
		[
			'a look-alike folder that is not the allowed one',
			'src/lib/components/ui-extra/x.svelte',
			svelte("import { Dialog } from 'bits-ui';")
		]
	])('refuses %s', (_name, rel, src) => {
		expect(bitsViolations(rel, src).length).toBeGreaterThan(0);
	});

	it('allows bits-ui under src/lib/components/ui, including nested folders and Windows paths', () => {
		const src = svelte("import { Dialog } from 'bits-ui';");
		expect(bitsViolations(UI, src)).toEqual([]);
		expect(bitsViolations('src\\lib\\components\\ui\\dialog\\dialog.svelte', src)).toEqual([]);
	});

	it('does not flag another package, a comment or a string', () => {
		expect(bitsViolations(FORM, svelte("import { cn } from '#lib/utils/cn.ts';"))).toEqual([]);
		expect(bitsViolations(FORM, svelte("// import { Dialog } from 'bits-ui';"))).toEqual([]);
		expect(bitsViolations(FORM, svelte("const doc = 'bits-ui is only in ui/';"))).toEqual([]);
		expect(bitsViolations(FORM, svelte("import x from 'bits-ui-extras';"))).toEqual([]);
	});
});

describe('check-banned-packages', () => {
	it.each(['vaul-svelte', 'lucide-svelte', 'mode-watcher', 'lucide-svelte/icons/x'])(
		'refuses an import of %s',
		(pkg) => {
			expect(findImportViolations(`import x from '${pkg}';`)).toHaveLength(1);
		}
	);

	it('allows the replacements and look-alikes', () => {
		expect(findImportViolations("import { Check } from '@lucide/svelte';")).toEqual([]);
		expect(findImportViolations("import Check from '@lucide/svelte/icons/check';")).toEqual([]);
		expect(findImportViolations("import { x } from 'mode-watcher-fork';")).toEqual([]);
	});

	it('refuses a banned name in any dependency field of package.json', () => {
		for (const field of [
			'dependencies',
			'devDependencies',
			'peerDependencies',
			'optionalDependencies'
		])
			expect(
				findManifestViolations(JSON.stringify({ [field]: { 'vaul-svelte': '^1.0.0' } }))
			).toEqual([`${field}.vaul-svelte`]);
	});

	it('passes a manifest without them', () => {
		expect(
			findManifestViolations(
				JSON.stringify({ dependencies: { 'bits-ui': '^2.21.0', '@lucide/svelte': '^1.0.0' } })
			)
		).toEqual([]);
		expect(findManifestViolations('{}')).toEqual([]);
	});
});
