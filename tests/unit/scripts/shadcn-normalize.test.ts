import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	iconExports,
	mergeImports,
	normalizeClasses,
	normalizeSource,
	remainingAlpha
} from '../../../scripts/shadcn/normalize.mjs';

const ICONS = new Set(['X', 'Check', 'Search', 'TriangleAlert', 'Loader2']);
const run = (src: string, icons: Set<string> = ICONS) =>
	normalizeSource(src, { icons }) as { out: string; problems: string[] };

describe('shadcn normaliser: imports', () => {
	it('rewrites the cn / utils import, whatever alias the CLI used', () => {
		for (const from of ['$lib/utils.js', '$lib/utils/cn', '#lib/utils/cn', '$lib/utils']) {
			expect(run(`import { cn } from "${from}";`).out).toBe(
				`import { cn } from '#lib/utils/cn.ts';`
			);
		}
	});
	it('rewrites $lib/components/ui/ to #lib/components/ui/ with a .ts index', () => {
		expect(run(`import { Button } from "$lib/components/ui/button/index.js";`).out).toBe(
			`import { Button } from '#lib/components/ui/button/index.ts';`
		);
		expect(run(`import * as D from '$lib/components/ui/dialog';`).out).toBe(
			`import * as D from '#lib/components/ui/dialog';`
		);
	});
	it('rewrites a lucide default import to the icon registry', () => {
		const { out, problems } = run(`import XIcon from '@lucide/svelte/icons/x';`);
		expect(out).toBe(`import { X as XIcon } from '#lib/icons/index.ts';`);
		expect(problems).toEqual([]);
		expect(run(`import Spin from '@lucide/svelte/icons/loader-2';`).out).toBe(
			`import { Loader2 as Spin } from '#lib/icons/index.ts';`
		);
	});
	it('fails, naming the icons, when the registry lacks one', () => {
		const { problems } = run(
			`import A from '@lucide/svelte/icons/octagon-x';\nimport B from '@lucide/svelte/icons/info';`
		);
		expect(problems.join('\n')).toContain('OctagonX');
		expect(problems.join('\n')).toContain('Info');
	});
});

describe('shadcn normaliser: relative index.js', () => {
	it('points a relative index.js at index.ts', () => {
		expect(run("import { buttonVariants } from '../button/index.js';").out).toBe(
			"import { buttonVariants } from '../button/index.ts';"
		);
	});
});

describe('shadcn normaliser: duplicate imports', () => {
	it('merges value and type imports from one module', () => {
		const src = `import { cn } from '#lib/utils/cn.ts';
import type { WithoutChildrenOrChild } from '#lib/utils/cn.ts';
import type { Snippet } from 'svelte';
import type { ComponentProps } from 'svelte';
`;
		expect(mergeImports(src)).toBe(
			`import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
import type { Snippet, ComponentProps } from 'svelte';
`
		);
	});
	it('merges icon imports and leaves single imports alone', () => {
		const out = run(
			`import A from '@lucide/svelte/icons/x';
import B from '@lucide/svelte/icons/check';
import { z } from 'zod';
`
		).out;
		expect(out).toBe(
			`import { X as A, Check as B } from '#lib/icons/index.ts';
import { z } from 'zod';
`
		);
	});
});

describe('shadcn normaliser: logical utilities', () => {
	it.each([
		['ml-auto', 'ms-auto'],
		['mr-2', 'me-2'],
		['-ml-1', '-ms-1'],
		['pl-7', 'ps-7'],
		['pr-1.5', 'pe-1.5'],
		['pl-2!', 'ps-2!'],
		['left-0', 'start-0'],
		['right-3', 'end-3'],
		['-right-2', '-end-2'],
		['-left-10', '-start-10'],
		['text-left', 'text-start'],
		['text-right', 'text-end'],
		['border-l', 'border-s'],
		['border-r-2', 'border-e-2'],
		['border-l-transparent', 'border-s-transparent'],
		['rounded-l-md', 'rounded-s-md'],
		['rounded-r', 'rounded-e'],
		['data-[side=right]:right-0', 'data-[side=right]:end-0'],
		['data-[side=left]:sm:border-r', 'data-[side=left]:sm:border-e'],
		['group-data-[state=open]:ml-2', 'group-data-[state=open]:ms-2']
	])('%s -> %s', (from, to) => {
		expect(normalizeClasses(from)).toBe(to);
	});

	it('leaves animation names, centring and unrelated classes alone', () => {
		const same = [
			'slide-in-from-left-10',
			'data-[side=left]:data-open:slide-in-from-left-10',
			'slide-out-to-right-10',
			'left-1/2',
			'-translate-x-1/2',
			'border-border',
			'text-left-foo-bar-not-a-class',
			'min-left'
		];
		for (const c of same) expect(normalizeClasses(c)).toBe(c);
	});

	it('rewrites inside class strings and cn() arguments, not other words', () => {
		const src = `<div class={cn("ml-auto flex pl-2", cond && 'mr-2', className)}>left of the right</div>`;
		expect(run(src).out).toBe(
			`<div class={cn("ms-auto flex ps-2", cond && 'me-2', className)}>left of the right</div>`
		);
	});
});

describe('shadcn normaliser: opaque tokens (L37)', () => {
	it.each([
		['hover:bg-primary/90', 'hover:bg-primary-hover'],
		['hover:bg-destructive/90', 'hover:bg-destructive-hover'],
		['ring-ring/50', 'ring-ring'],
		['focus-visible:ring-ring/50', 'focus-visible:ring-ring'],
		['text-sidebar-foreground/70', 'text-sidebar-muted-foreground'],
		['dark:bg-input/30', 'dark:bg-input-fill'],
		['bg-input/30', 'bg-input-fill'],
		['border-input/30', 'border-input'],
		['ring-foreground/10', 'ring-border'],
		['bg-muted/50', 'bg-muted'],
		['bg-black/10', 'bg-scrim'],
		['bg-black/50', 'bg-scrim'],
		['text-foreground/60', 'text-muted-foreground'],
		['cn-rtl-flip', 'rtl:rotate-180'],
		['z-50', 'z-(--z-popover)'],
		['has-data-checked:bg-primary/5', 'has-data-checked:bg-primary-soft'],
		['dark:has-data-checked:bg-primary/10', 'dark:has-data-checked:bg-primary-soft'],
		['has-data-checked:border-primary/30', 'has-data-checked:border-primary'],
		['dark:has-data-checked:border-primary/20', 'dark:has-data-checked:border-primary'],
		['disabled:bg-input/50', 'disabled:bg-muted'],
		['dark:disabled:bg-input/80', 'dark:disabled:bg-muted'],
		['dark:hover:bg-input/50', 'dark:hover:bg-muted'],
		['dark:data-unchecked:bg-input/80', 'dark:data-unchecked:bg-input'],
		['not-data-selected:hover:bg-accent/50', 'not-data-selected:hover:bg-accent'],
		['dark:data-[range-middle]:hover:bg-accent/0', 'dark:data-[range-middle]:hover:bg-transparent'],
		['aria-invalid:ring-destructive/20', ''],
		['aria-invalid:ring-3', ''],
		['dark:data-unchecked:bg-foreground', ''],
		['dark:data-checked:bg-foreground', 'dark:data-checked:bg-foreground'],
		['focus-visible:ring-3', 'focus-visible:ring-3'],
		['dark:aria-invalid:ring-destructive/40', ''],
		[
			'data-[variant=destructive]:focus:bg-destructive/10',
			'data-[variant=destructive]:focus:bg-destructive-soft'
		],
		[
			'dark:data-[variant=destructive]:focus:bg-destructive/20',
			'dark:data-[variant=destructive]:focus:bg-destructive-soft'
		]
	])('%s -> %s', (from, to) => {
		expect(normalizeClasses(from)).toBe(to);
	});

	it('fails on a remaining alpha on a text, ring, border-input or solid-fill colour', () => {
		for (const bad of [
			'bg-primary/50',
			'text-foreground/55',
			'ring-primary/30',
			'border-input/70',
			'bg-secondary/80'
		]) {
			const { problems } = run(`<i class="${bad}"></i>`);
			expect(problems.join('\n'), bad).toContain(bad);
		}
		expect(remainingAlpha('<i class="bg-scrim"></i>')).toEqual([]);
	});
	it('does not flag sizes, fractions or the scrim token', () => {
		const { problems } = run(`<i class="text-sm/6 w-1/2 h-2/3 bg-scrim top-1/3"></i>`);
		expect(problems).toEqual([]);
	});
});

describe('shadcn normaliser: tailwind-variants to cva', () => {
	// the package name is assembled so this fixture is not itself an import of it (check-banned-packages)
	const pkg = ['tailwind', 'variants'].join('-');
	const tv = `<script lang="ts" module>
	import { tv, type VariantProps } from "${pkg}";

	export const fieldVariants = tv({
		base: "group/field flex w-full",
		variants: { orientation: { vertical: "flex-col", horizontal: "flex-row" } },
		defaultVariants: { orientation: "vertical" },
	});
	export type FieldOrientation = VariantProps<typeof fieldVariants>["orientation"];
</script>`;

	it('rewrites the import and the base form', () => {
		const { out, problems } = run(tv);
		expect(problems).toEqual([]);
		expect(out).toContain(`import { cva, type VariantProps } from 'class-variance-authority';`);
		expect(out).toContain(`fieldVariants = cva("group/field flex w-full", {`);
		expect(out).toContain('variants: { orientation');
		expect(out).not.toContain('tailwind-variants');
		expect(out).not.toMatch(/\btv\(/);
	});
	it('is idempotent', () => {
		const once = run(tv).out;
		expect(run(once).out).toBe(once);
	});
	it('fails on the slots form', () => {
		const slots = `import { tv } from "tailwind-variants";\nconst v = tv({ slots: { root: "a" } });`;
		expect(run(slots).problems.join('\n')).toContain('slots');
	});
	it('leaves a file without tailwind-variants alone', () => {
		expect(run(`const tv = 1;`).out).toBe(`const tv = 1;`);
	});
});

describe('shadcn normaliser: the whole pass', () => {
	const fixture = `<script lang="ts">
	import { cn } from "$lib/utils.js";
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from "$lib/components/ui/button/index.js";
</script>
<div class={cn("ml-auto pl-2 hover:bg-primary/90 ring-ring/50", className)}><XIcon /></div>`;

	it('is idempotent', () => {
		const once = run(fixture);
		expect(once.problems).toEqual([]);
		expect(run(once.out).out).toBe(once.out);
		expect(once.out).toContain('ms-auto ps-2 hover:bg-primary-hover ring-ring');
	});
	it('reads the real registry', () => {
		const names = iconExports();
		expect(names.has('X')).toBe(true);
		expect(names.has('ChevronRight')).toBe(true);
	});
});

describe('shadcn normaliser: only class strings are rewritten', () => {
	it('leaves a comment and a non-class string alone', () => {
		const src = [
			'<script lang="ts">',
			'	// right-click opens the menu',
			"	const placement = 'left-start';",
			"	const label = 'text-left of the box';",
			'</script>',
			'<div class="ml-2 text-left"></div>'
		].join('\n');
		const { out } = run(src);
		expect(out).toContain('// right-click opens the menu');
		expect(out).toContain("const placement = 'left-start';");
		expect(out).toContain("const label = 'text-left of the box';");
		expect(out).toContain('<div class="ms-2 text-start"></div>');
	});

	it('rewrites the string literals of cn() and cva() and class={...}', () => {
		const { out } = run(
			[
				"<div class={cn('mr-1', open && 'pl-2')}></div>",
				"const v = cva('left-2 text-right', { variants: { a: { b: 'border-l' } } });"
			].join('\n')
		);
		expect(out).toContain("cn('me-1', open && 'ps-2')");
		expect(out).toContain("cva('start-2 text-end', { variants: { a: { b: 'border-s' } } })");
	});
});

describe('shadcn normaliser: z-50 takes the layer of its component family', () => {
	const z = (file: string) =>
		(normalizeSource('<div class="z-50"></div>', { icons: ICONS, file }) as { out: string }).out;
	it('modal surfaces use the modal layer for panel and scrim', () => {
		for (const folder of ['dialog', 'sheet', 'alert-dialog'])
			expect(z(`src/lib/components/ui/${folder}/x.svelte`)).toContain('z-(--z-modal)');
	});
	it('sidebar and table parts are sticky, everything else floats', () => {
		expect(z('src/lib/components/ui/sidebar/x.svelte')).toContain('z-(--z-sticky)');
		expect(z('src/lib/components/ui/table/x.svelte')).toContain('z-(--z-sticky)');
		expect(z('src/lib/components/ui/popover/x.svelte')).toContain('z-(--z-popover)');
		expect(z('src/lib/components/ui/select/x.svelte')).toContain('z-(--z-popover)');
	});
});

describe('shadcn normaliser: primary roles (plan G1)', () => {
	const cls = (src: string, file: string) =>
		(normalizeSource(src, { icons: ICONS, file }) as { out: string }).out;

	it('maps the checked state of a checkbox to the indicator tokens', () => {
		const out = cls(
			`<div class="data-checked:bg-primary data-checked:text-primary-foreground data-checked:border-primary"></div>`,
			'src/lib/components/ui/checkbox/x.svelte'
		);
		expect(out).toContain('data-checked:bg-primary-indicator');
		expect(out).toContain('data-checked:text-primary-indicator-foreground');
		expect(out).toContain('data-checked:border-primary-indicator');
	});
	it.each(['radio-group', 'switch', 'slider', 'progress', 'tabs'])(
		'rewrites bg-primary to the indicator in %s',
		(family) => {
			expect(
				cls(`<i class="bg-primary"></i>`, `src/lib/components/ui/${family}/x.svelte`)
			).toContain('bg-primary-indicator');
		}
	);
	it('leaves bg-primary alone in a button (a labelled fill)', () => {
		const out = cls(
			`<button class="bg-primary text-primary-foreground"></button>`,
			'src/lib/components/ui/button/x.svelte'
		);
		expect(out).toContain('bg-primary text-primary-foreground');
		expect(out).not.toContain('indicator');
	});
	it('rewrites a bare text-primary everywhere, and never text-primary-foreground', () => {
		expect(cls(`<a class="text-primary"></a>`, 'src/lib/components/ui/badge/x.svelte')).toContain(
			'text-primary-text'
		);
		expect(
			cls(`<a class="text-primary-foreground"></a>`, 'src/lib/components/ui/badge/x.svelte')
		).toContain('text-primary-foreground"');
	});
	it('a link underlines on hover instead of changing colour', () => {
		expect(normalizeClasses('text-primary hover:text-primary-hover')).toBe(
			'text-primary-text hover:underline'
		);
	});
	it('is idempotent on the new rewrites', () => {
		const once = cls(
			`<i class="data-checked:bg-primary text-primary"></i>`,
			'src/lib/components/ui/checkbox/x.svelte'
		);
		expect(cls(once, 'src/lib/components/ui/checkbox/x.svelte')).toBe(once);
	});
});

describe('shadcn normaliser: the scrim (plan G2)', () => {
	it('turns the overlay default into bg-scrim and drops the blur', () => {
		expect(
			normalizeClasses(
				'bg-black/50 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0'
			)
		).toBe('bg-scrim duration-100  fixed inset-0');
	});
	it('maps the nova bg-black/10 overlay to bg-scrim too', () => {
		expect(normalizeClasses('bg-black/10')).toBe('bg-scrim');
	});
	it('is idempotent', () => {
		const once = normalizeClasses('bg-black/50 supports-backdrop-filter:backdrop-blur-xs');
		expect(normalizeClasses(once)).toBe(once);
	});
});

describe('shadcn normaliser: the pane material (plan G5)', () => {
	const ui = (family: string, file: string) => `src/lib/components/ui/${family}/${file}`;
	const cls = (src: string, file: string) =>
		(normalizeSource(src, { icons: ICONS, file }) as { out: string }).out;
	const CONTENT =
		'<i class="bg-popover text-popover-foreground ring-border rounded-lg p-1 shadow-md ring-1 duration-100"></i>';

	it.each([
		['dialog', 'dialog-content.svelte'],
		['alert-dialog', 'alert-dialog-content.svelte'],
		['sheet', 'sheet-content.svelte'],
		['popover', 'popover-content.svelte'],
		['dropdown-menu', 'dropdown-menu-content.svelte'],
		['dropdown-menu', 'dropdown-menu-sub-content.svelte'],
		['select', 'select-content.svelte']
	])(
		'%s content: bg-popover becomes material-pane; shadow, ring and ring colour go; rounded-xl',
		(f, file) => {
			const out = cls(CONTENT, ui(f, file));
			expect(out).toContain('material-pane');
			expect(out).toContain('text-popover-foreground');
			expect(out).toContain('rounded-xl');
			for (const gone of ['bg-popover', 'shadow-md', 'ring-1', 'ring-border', 'rounded-lg'])
				expect(out).not.toContain(gone);
		}
	);

	it('shadow-lg goes too, and the sheet drops its side borders (the material edge replaces them)', () => {
		const out = cls(
			'<i class="bg-popover shadow-lg data-[side=bottom]:border-t data-[side=left]:border-s data-[side=right]:border-e data-[side=top]:border-b data-[side=left]:w-3/4"></i>',
			ui('sheet', 'sheet-content.svelte')
		);
		expect(out).toContain('material-pane');
		expect(out).toContain('data-[side=left]:w-3/4');
		expect(out).not.toMatch(/shadow-lg|border-[tseb]\b/);
	});

	it('items: rounded-sm and rounded-md become rounded-lg', () => {
		for (const [f, file] of [
			['dropdown-menu', 'dropdown-menu-item.svelte'],
			['dropdown-menu', 'dropdown-menu-checkbox-item.svelte'],
			['dropdown-menu', 'dropdown-menu-sub-trigger.svelte'],
			['select', 'select-item.svelte'],
			['command', 'command-item.svelte']
		])
			for (const r of ['rounded-sm', 'rounded-md'])
				expect(cls(`<i class="${r} px-2"></i>`, ui(f, file))).toBe(
					'<i class="rounded-lg px-2"></i>'
				);
	});

	it('the command root is transparent (the dialog or popover around it is the material)', () => {
		expect(cls('<i class="bg-popover rounded-xl! p-1"></i>', ui('command', 'command.svelte'))).toBe(
			'<i class="bg-transparent rounded-xl! p-1"></i>'
		);
	});

	it('does not touch bg-popover outside the material families or outside content files', () => {
		expect(cls('<i class="bg-popover"></i>', ui('card', 'card.svelte'))).toBe(
			'<i class="bg-popover"></i>'
		);
		expect(cls('<i class="bg-popover"></i>', ui('select', 'select-scroll-up-button.svelte'))).toBe(
			'<i class="bg-popover"></i>'
		);
	});

	it('is idempotent', () => {
		const file = ui('popover', 'popover-content.svelte');
		const once = cls(CONTENT, file);
		expect(cls(once, file)).toBe(once);
	});
});

describe('shadcn normaliser: item labels on glass are medium weight (plan G7)', () => {
	const file = (f: string, n: string) => `src/lib/components/ui/${f}/${n}`;
	const run2 = (src: string, f: string) =>
		(normalizeSource(src, { icons: ICONS, file: f }) as { out: string }).out;
	const ITEMS = [
		['dropdown-menu', 'dropdown-menu-item.svelte'],
		['dropdown-menu', 'dropdown-menu-checkbox-item.svelte'],
		['dropdown-menu', 'dropdown-menu-radio-item.svelte'],
		['dropdown-menu', 'dropdown-menu-sub-trigger.svelte'],
		['select', 'select-item.svelte'],
		['command', 'command-item.svelte']
	];
	it.each(ITEMS)('%s/%s: text-sm gains font-medium, once', (f, n) => {
		const once = run2('<i class="gap-1 text-sm px-2"></i>', file(f, n));
		expect(once).toBe('<i class="gap-1 text-sm font-medium px-2"></i>');
		expect(run2(once, file(f, n))).toBe(once);
	});
	it('does not touch a content file or a file outside the families', () => {
		expect(
			run2('<i class="text-sm"></i>', file('dropdown-menu', 'dropdown-menu-content.svelte'))
		).toBe('<i class="text-sm"></i>');
		expect(run2('<i class="text-sm"></i>', file('card', 'card.svelte'))).toBe(
			'<i class="text-sm"></i>'
		);
	});
});

describe('shadcn normaliser: the alert dialog keeps its height cap and scrolling body', () => {
	const dir = 'src/lib/components/ui/alert-dialog';
	const committed = (name: string) => readFileSync(`${dir}/${name}`, 'utf8');
	const regenerate = (name: string, strip: (s: string) => string) =>
		(
			normalizeSource(strip(committed(name)), { icons: ICONS, file: `${dir}/${name}` }) as {
				out: string;
			}
		).out;

	it('content: a grid without the cap regenerates to the committed flex column capped at 90dvh', () => {
		const stripped = (s: string) =>
			s
				.replace('max-h-[90dvh] ', '')
				.replace('flex flex-col', 'grid')
				.replace('data-[size=default]:sm:max-w-md', 'data-[size=default]:sm:max-w-sm');
		expect(stripped(committed('alert-dialog-content.svelte'))).not.toBe(
			committed('alert-dialog-content.svelte')
		);
		expect(regenerate('alert-dialog-content.svelte', stripped)).toBe(
			committed('alert-dialog-content.svelte')
		);
	});

	it.each([
		['alert-dialog-header.svelte', 'shrink-0 '],
		['alert-dialog-footer.svelte', 'shrink-0 ']
	])('%s: the shrink-0 that keeps it pinned is put back', (name, gone) => {
		const stripped = (s: string) => s.replace(gone, '');
		expect(stripped(committed(name))).not.toBe(committed(name));
		expect(regenerate(name, stripped)).toBe(committed(name));
	});

	it('is idempotent: normalising the committed files changes nothing', () => {
		for (const name of [
			'alert-dialog-content.svelte',
			'alert-dialog-header.svelte',
			'alert-dialog-footer.svelte'
		])
			expect(regenerate(name, (s) => s)).toBe(committed(name));
	});

	it('only the alert dialog files carry the customizations', () => {
		const out = (
			normalizeSource('<div class="grid gap-4"></div>', {
				icons: ICONS,
				file: 'src/lib/components/ui/dialog/dialog-content.svelte'
			}) as { out: string }
		).out;
		expect(out).toBe('<div class="grid gap-4"></div>');
	});
});

describe('shadcn normaliser: the hand-written roots of dialog and sheet (busy veto, hold / onHeld)', () => {
	const UI = 'src/lib/components/ui';
	const OVERRIDES = 'scripts/shadcn/overrides';
	// the primitive library's name, written so the bits-ui boundary gate does not mistake test data for an import
	const UPSTREAM_PRIMITIVES = ['bits', 'ui'].join('-');
	const pristine = (primitive: string) =>
		`<script lang="ts">
	import { ${primitive} as DialogPrimitive } from "${UPSTREAM_PRIMITIVES}";

	let { open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps} />
`;
	const regenerate = (name: 'dialog' | 'sheet') =>
		normalizeSource(pristine('Dialog'), { icons: ICONS, file: `${UI}/${name}/${name}.svelte` }) as {
			out: string;
			problems: string[];
		};

	it.each(['dialog', 'sheet'] as const)(
		'a pristine upstream %s root is normalised to the committed file (hold, onHeld and the busy veto back)',
		(name) => {
			const { out, problems } = regenerate(name);
			expect(problems).toEqual([]);
			expect(out).toBe(readFileSync(`${UI}/${name}/${name}.svelte`, 'utf8'));
			expect(out).toContain('onHeld');
			expect(out).toContain('createBusyVeto');
		}
	);

	it.each(['dialog', 'sheet'] as const)(
		'%s: the re-applied root is stable (idempotent)',
		(name) => {
			const once = regenerate(name).out;
			expect(
				(
					normalizeSource(once, { icons: ICONS, file: `${UI}/${name}/${name}.svelte` }) as {
						out: string;
					}
				).out
			).toBe(once);
		}
	);

	it.each(['dialog', 'sheet'] as const)(
		'%s: the stored override is the committed file (they cannot drift apart)',
		(name) => {
			expect(readFileSync(`${OVERRIDES}/${name}.svelte.tpl`, 'utf8')).toBe(
				readFileSync(`${UI}/${name}/${name}.svelte`, 'utf8')
			);
		}
	);

	it('a root that lost only `hold` is still re-applied, never left half-customised', () => {
		const committed = readFileSync(`${UI}/sheet/sheet.svelte`, 'utf8');
		const { out } = normalizeSource(
			committed.replaceAll('hold?.()', 'false').replace('\thold,\n', ''),
			{
				icons: ICONS,
				file: `${UI}/sheet/sheet.svelte`
			}
		) as { out: string };
		expect(out).toBe(committed);
	});
});
