import { describe, expect, it } from 'vitest';
import { renameSource } from '../../../scripts/codemods/ui-api-renames.mjs';

const run = (s: string) => renameSource(s) as { out: string; unmapped: Array<{ what: string }> };

describe('ui-api-renames codemod', () => {
	it('renames Button variants and drops the default size', () => {
		expect(run('<Button variant="primary" size="md" onclick={go}>x</Button>').out).toBe(
			'<Button variant="default" onclick={go}>x</Button>'
		);
		expect(run('<Button variant="danger">x</Button>').out).toBe(
			'<Button variant="destructive">x</Button>'
		);
		expect(run('<Button variant="glass" size="sm">x</Button>').out).toBe(
			'<Button variant="outline" size="sm">x</Button>'
		);
	});
	it('turns fullWidth into a w-full class, merging with an existing class', () => {
		expect(run('<Button fullWidth>x</Button>').out).toBe('<Button class="w-full">x</Button>');
		expect(run('<Button fullWidth class="mt-2">x</Button>').out).toBe(
			'<Button class="mt-2 w-full">x</Button>'
		);
		expect(run('<Button fullWidth class={cls}>x</Button>').out).toBe(
			"<Button class={['w-full', cls]}>x</Button>"
		);
	});
	it('handles Dropdown.Trigger like Button', () => {
		expect(run('<Dropdown.Trigger variant="glass" size="md" aria-label="More">').out).toBe(
			'<Dropdown.Trigger variant="outline" aria-label="More">'
		);
	});
	it('drops Badge appearance and size, and maps appearance="outline" to a variant', () => {
		expect(run('<Badge variant="success" appearance="soft" size="sm">x</Badge>').out).toBe(
			'<Badge variant="success">x</Badge>'
		);
		expect(run('<Badge variant="neutral" appearance="outline">x</Badge>').out).toBe(
			'<Badge variant="outline">x</Badge>'
		);
		expect(run('<Badge appearance="outline">x</Badge>').out).toBe(
			'<Badge variant="outline">x</Badge>'
		);
		// a status or dynamic variant keeps its colour
		expect(run('<Badge variant="info" appearance="outline">x</Badge>').out).toBe(
			'<Badge variant="info">x</Badge>'
		);
		expect(run('<Badge variant={v} appearance="outline" size="sm">x</Badge>').out).toBe(
			'<Badge variant={v}>x</Badge>'
		);
		expect(run('<Badge variant="danger">x</Badge>').out).toBe('<Badge variant="danger">x</Badge>');
	});
	it('maps Alert danger to destructive', () => {
		expect(run('<Alert variant="danger" title="Oops">x</Alert>').out).toBe(
			'<Alert variant="destructive" title="Oops">x</Alert>'
		);
	});
	it('moves Pagination off $ui', () => {
		const { out } = run(`import { Button, Pagination } from '#lib/components/ui/index.ts';`);
		expect(out).toBe(
			`import { Button } from '#lib/components/ui/index.ts';\nimport Pagination from '#lib/components/data/Pagination.svelte';`
		);
		expect(run(`import { Pagination } from '#lib/components/ui/index.ts';`).out).toBe(
			`import Pagination from '#lib/components/data/Pagination.svelte';`
		);
	});
	it('reports a dynamic spelling it cannot map', () => {
		const { unmapped } = run(`<Button variant={x ? 'danger' : 'ghost'}>x</Button>`);
		expect(unmapped.map((u) => u.what).join()).toContain('danger');
	});
	it('does not read braces inside attribute expressions as the end of the tag', () => {
		const src = `<Button variant="primary" onclick={() => { a(); b(); }} disabled={x > 1}>x</Button>`;
		expect(run(src).out).toBe(
			`<Button variant="default" onclick={() => { a(); b(); }} disabled={x > 1}>x</Button>`
		);
	});
	it('is idempotent', () => {
		const once = run('<Button variant="primary" fullWidth>x</Button>').out;
		expect(run(once).out).toBe(once);
	});
});
