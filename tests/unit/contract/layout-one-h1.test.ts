import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A folder's `+error.svelte` renders inside that folder's `+layout.svelte`. A layout that renders a
 * PageHeader (an `<h1>`) therefore puts a second `<h1>` on its error page unless its children sit
 * inside `NestedPageHeaders` (the error page's header then becomes an `<h2>`).
 *
 * A layout counts as rendering a header when it uses `<PageHeader`, imports it, or writes an `<h1`
 * itself. The runtime nested-error walk (e2e) covers what a source read cannot (a header rendered
 * by a component the layout composes).
 */
const layouts = globSync('src/routes/**/+layout.svelte').map((p) => p.replaceAll('\\', '/'));

const RENDERS_HEADER = /<PageHeader[\s>]|import\s+PageHeader\b|<h1[\s>]/;
const WRAPS_CHILDREN =
	/<NestedPageHeaders>[\s\S]*\{@render children\(\)\}[\s\S]*<\/NestedPageHeaders>/;

/** The layouts that render a header but do not wrap their children in NestedPageHeaders. */
export function unwrappedHeaderLayouts(files: Map<string, string>): string[] {
	return [...files]
		.filter(([, src]) => RENDERS_HEADER.test(src) && !WRAPS_CHILDREN.test(src))
		.map(([path]) => path);
}

describe('layouts that render a PageHeader', () => {
	const files = new Map(layouts.map((p) => [p, readFileSync(p, 'utf8')]));
	const withHeader = layouts.filter((p) => RENDERS_HEADER.test(files.get(p)!));

	it('finds the known ones', () => {
		expect(withHeader.length).toBeGreaterThanOrEqual(3);
	});

	it('no layout renders a header without wrapping its children in NestedPageHeaders', () => {
		expect(unwrappedHeaderLayouts(files)).toEqual([]);
	});

	it.each(withHeader)('%s wraps its children in NestedPageHeaders', (path) => {
		expect(files.get(path)).toMatch(WRAPS_CHILDREN);
	});
});

describe('the fence itself', () => {
	const wrapped = `<script>import PageHeader from 'x';</script><PageHeader/><NestedPageHeaders>{@render children()}</NestedPageHeaders>`;
	it('passes a wrapped layout', () => {
		expect(unwrappedHeaderLayouts(new Map([['a', wrapped]]))).toEqual([]);
	});
	it('fails a layout that renders a PageHeader and its children bare', () => {
		const bare = `<PageHeader title="x" />{@render children()}`;
		expect(unwrappedHeaderLayouts(new Map([['a', bare]]))).toEqual(['a']);
	});
	it('fails a layout that imports PageHeader without wrapping (indirect use)', () => {
		const imported = `<script>import PageHeader from '#lib/layouts/PageHeader.svelte';</script>{@render children()}`;
		expect(unwrappedHeaderLayouts(new Map([['a', imported]]))).toEqual(['a']);
	});
	it('fails a layout with its own <h1>', () => {
		expect(unwrappedHeaderLayouts(new Map([['a', `<h1>x</h1>{@render children()}`]]))).toEqual([
			'a'
		]);
	});
	it('ignores a layout with no header at all', () => {
		expect(unwrappedHeaderLayouts(new Map([['a', `{@render children()}`]]))).toEqual([]);
	});
});
