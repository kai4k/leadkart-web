import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A folder's `+error.svelte` renders inside that folder's `+layout.svelte`. A layout that renders a
 * PageHeader (an `<h1>`) therefore puts a second `<h1>` on its error page unless its children sit
 * inside `NestedPageHeaders` (the error page's header then becomes an `<h2>`).
 */
const layouts = globSync('src/routes/**/+layout.svelte').map((p) => p.replaceAll('\\', '/'));

describe('layouts that render a PageHeader', () => {
	const withHeader = layouts.filter((p) => /<PageHeader[\s>]/.test(readFileSync(p, 'utf8')));

	it('finds the known ones', () => {
		expect(withHeader.length).toBeGreaterThanOrEqual(3);
	});

	it.each(withHeader)('%s wraps its children in NestedPageHeaders', (path) => {
		const src = readFileSync(path, 'utf8');
		expect(src).toMatch(
			/<NestedPageHeaders>[\s\S]*\{@render children\(\)\}[\s\S]*<\/NestedPageHeaders>/
		);
	});
});
