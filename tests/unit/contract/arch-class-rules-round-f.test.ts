import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	findBareTextPrimary,
	findPrimaryMarks,
	findTextOnControl
} from '../../../scripts/arch/check-tokens.mjs';

/**
 * Fix round F (review I4, M2, M3): fixtures for what the class rules missed in the real tree's idioms, and the scope of
 * m6 derived from what a file renders. Every fixture failed on the rules as they were at 1b1a6c83.
 */
const F = 'src/lib/features/demo/components/Demo.svelte';
const marks = (src: string) =>
	(findPrimaryMarks(F, src) as Array<{ name: string }>).map((f) => f.name);
const onControl = (src: string, rel = F) =>
	(findTextOnControl(rel, src) as Array<{ name: string }>).map((f) => f.name);
const mat = (body: string) =>
	`<script>import { Dialog } from '$ui';</script>\n<Dialog.Content>${body}</Dialog.Content>`;

describe('m5: marks written as arbitrary values and Tailwind 4 utilities', () => {
	it.each([
		'border-(--primary)',
		'border-[var(--primary)]',
		'fill-(--primary)',
		'stroke-[var(--primary)]',
		'ring-[color:var(--primary)]',
		'inset-ring-primary',
		'inset-shadow-primary',
		'drop-shadow-primary',
		'text-shadow-primary'
	])('refuses %s', (utility) => {
		expect(marks(`<div class="${utility}"></div>`)).toContain(utility);
	});
	it.each(['text-(--primary)', 'text-[var(--primary)]', 'text-[color:var(--primary)]'])(
		'refuses %s as bare primary text',
		(utility) => {
			const found = findBareTextPrimary(F, `<p class="${utility}">x</p>`) as Array<{
				name: string;
			}>;
			expect(found.map((f) => f.name)).toContain(utility);
		}
	);
	it('refuses bg-(--primary) and bg-[var(--primary)] without a label, accepts them with one', () => {
		expect(marks('<div class="bg-(--primary)"></div>')).toContain('bg-(--primary)');
		expect(marks('<div class="bg-[var(--primary)]"></div>')).toContain('bg-[var(--primary)]');
		expect(marks('<div class="bg-(--primary) text-primary-foreground">x</div>')).toEqual([]);
	});
	it('accepts the indicator and primary-text tokens', () => {
		expect(marks('<div class="border-primary-indicator text-primary-text"></div>')).toEqual([]);
	});
});

describe('m5: interpolation, inline styles, ternaries, parse failures', () => {
	it('refuses a class built by Svelte attribute interpolation', () => {
		expect(marks('<div class="border-{tone}"></div>')).toHaveLength(1);
		expect(marks('<div class="p-2 text-{tone}"></div>')).toHaveLength(1);
		expect(marks('<div class="p-{n}"></div>')).toEqual([]); // not a colour utility
	});
	it('refuses var(--primary) as a mark in a style attribute or a style: directive', () => {
		expect(marks('<div style="color: var(--primary)"></div>')).toHaveLength(1);
		expect(marks('<div style="border-color: var(--primary); margin: 0"></div>')).toHaveLength(1);
		expect(marks('<div style:fill="var(--primary)"></div>')).toHaveLength(1);
		expect(marks('<div style="margin: 0"></div>')).toEqual([]);
		expect(marks('<div style="background: var(--primary-soft)"></div>')).toEqual([]);
	});
	it('a label in the OTHER arm of a ternary is no label', () => {
		expect(marks(`<div class={on ? 'bg-primary' : 'text-primary-foreground'}></div>`)).toEqual([
			'bg-primary'
		]);
		// the same arm is fine, and so is a label outside the ternary
		expect(marks(`<div class={on ? 'bg-primary text-primary-foreground' : 'p-2'}></div>`)).toEqual(
			[]
		);
		expect(
			marks(`<div class={['text-primary-foreground', on ? 'bg-primary' : 'p-2']}></div>`)
		).toEqual([]);
	});
	it('a .svelte file that does not parse is a finding for m5 and m6, naming the file', () => {
		const broken = '<div class="bg-primary"';
		for (const finder of [findPrimaryMarks, findBareTextPrimary, findTextOnControl]) {
			const found = finder(F, broken) as Array<{ name: string }>;
			expect(found, finder.name).toHaveLength(1);
			expect(found[0].name).toContain(F);
			expect(found[0].name).toContain('does not parse');
		}
	});
});

describe('m6: list order is a winner only inside cn()', () => {
	const plain = mat(`<div class="focus:bg-muted focus:bg-card text-destructive">x</div>`);
	const merged = mat(`<div class={cn('focus:bg-muted focus:bg-card', 'text-destructive')}>x</div>`);
	it('a plain class attribute is a hit however the list is ordered (the stylesheet order decides)', () => {
		expect(onControl(plain)).toEqual(['focus:bg-muted with text-destructive']);
		expect(
			onControl(mat(`<div class="focus:bg-card focus:bg-muted text-destructive">x</div>`))
		).toEqual(['focus:bg-muted with text-destructive']);
	});
	it('inside cn() the later gated fill wins (tailwind-merge)', () => {
		expect(onControl(merged)).toEqual([]);
	});
	it('a strictly more specific state wins in a plain attribute too (the destructive menu item)', () => {
		expect(
			onControl(
				mat(
					`<div class="focus:bg-accent data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive-soft">x</div>`
				)
			)
		).toEqual([]);
	});
});

describe('m6: the file scope follows what a file renders', () => {
	const hostile = (body: string) => `${body}`;
	const cases: Array<[string, string]> = [
		[
			'the $ui alias Dropdown',
			`<script>import { Dropdown } from '$ui';</script>\n<div class="bg-accent text-destructive">x</div>`
		],
		[
			'a ConfirmDialog consumer',
			`<script>import { ConfirmDialog } from '$ui';</script>\n<div class="bg-accent text-destructive">x</div>`
		],
		[
			'a namespace import of an overlay family',
			`<script>import * as Dialog from '#lib/components/ui/dialog/index.ts';</script>\n<div class="bg-accent text-destructive">x</div>`
		],
		[
			'a default import of a wrapper file',
			`<script>import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';</script>\n<div class="bg-accent text-destructive">x</div>`
		],
		[
			'a ReasonConfirmDialog named import from the feedback barrel',
			`<script>import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';</script>\n<div class="bg-accent text-destructive">x</div>`
		],
		[
			'a FormSheet named import from the form barrel',
			`<script>import { FormSheet, TextField } from '#lib/components/form/index.ts';</script>\n<div class="bg-accent text-destructive">x</div>`
		],
		[
			'a Drawer wrapper file',
			`<script>import BulkUploadDrawer from '$lib/components/data/BulkUploadDrawer.svelte';</script>\n<div class="bg-accent text-destructive">x</div>`
		]
	];
	it.each(cases)('is in scope: %s', (_name, src) => {
		expect(onControl(hostile(src))).toEqual(['bg-accent with text-destructive']);
	});
	it('a file that renders no overlay stays out of scope', () => {
		expect(onControl(`<div class="bg-accent text-destructive">x</div>`)).toEqual([]);
	});
	it('the real files named by the review are in scope and clean', () => {
		const read = (p: string) => readFileSync(p, 'utf8');
		for (const rel of [
			'src/lib/layouts/UserMenu.svelte',
			'src/lib/features/operator/people/components/AnonymiseDialog.svelte',
			'src/lib/components/form/Combobox.svelte'
		]) {
			const src = read(rel);
			expect(onControl(src, rel), rel).toEqual([]);
			// ... and in scope: the same file with a hostile element appended is flagged
			expect(
				onControl(`${src}\n<div class="bg-accent text-destructive">x</div>`, rel),
				rel
			).toEqual(['bg-accent with text-destructive']);
		}
	});
});
