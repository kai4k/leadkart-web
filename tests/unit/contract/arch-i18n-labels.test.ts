import { describe, expect, it } from 'vitest';
import { findHardcodedLabels } from '../../../scripts/arch/lib/hardcoded-labels.mjs';

/** Self-test of the hard-coded label rule: fixtures, not the repository. */
const UI = 'src/lib/components/ui/alert/alert.svelte';
const found = (src: string, rel = UI) =>
	(findHardcodedLabels(rel, src) as Array<{ line: number; text: string }>).map((f) => f.text);

describe('check-i18n-coverage: hard-coded labels in the shared layers', () => {
	it.each([
		['aria-label', '<button aria-label="Dismiss"></button>', 'Dismiss'],
		['placeholder', '<input placeholder="Search…" />', 'Search…'],
		['title', '<Alert title="Couldn\'t load"></Alert>', "Couldn't load"],
		['alt', '<img alt="Company logo" />', 'Company logo'],
		[
			'interpolated English',
			'<i aria-label="Remove {chip.label} filter"></i>',
			'Remove {chip.label} filter'
		],
		['sr-only text', '<span class="sr-only">Loading</span>', 'Loading']
	])('flags a literal %s', (_name, src, text) => {
		expect(found(src)).toEqual([text]);
	});

	it('does not flag translated or computed values', () => {
		expect(found("<i aria-label={$_('common.dismiss')}></i>")).toEqual([]);
		expect(found('<i aria-label={label} title={member.name}></i>')).toEqual([]);
		expect(found('<i aria-label="{count}"></i>')).toEqual([]);
		expect(found('<span class="sr-only">{$_(\'common.close\')}</span>')).toEqual([]);
		expect(found('<i data-title="x" aria-label=""></i>')).toEqual([]);
	});

	it('reports the line and honours i18n-allow on that line or the one above', () => {
		const [hit] = findHardcodedLabels(UI, 'a\nb\n<i aria-label="Members"></i>');
		expect(hit.line).toBe(3);
		expect(found('<!-- i18n-allow -->\n<i aria-label="Members"></i>')).toEqual([]);
		expect(found('<i aria-label="Members"></i> <!-- i18n-allow -->')).toEqual([]);
	});

	it('covers ui, form, data and feedback only; skips stories and the legacy data-table', () => {
		const src = '<i aria-label="Members"></i>';
		for (const dir of ['ui', 'form', 'data', 'feedback'])
			expect(found(src, `src/lib/components/${dir}/X.svelte`)).toEqual(['Members']);
		expect(found(src, 'src/lib/features/x/X.svelte')).toEqual([]);
		expect(found(src, 'src/lib/layouts/X.svelte')).toEqual([]);
		expect(found(src, 'src/lib/components/form/X.stories.svelte')).toEqual([]);
		expect(found(src, 'src/lib/components/ui/data-table/DataTable.svelte')).toEqual([]);
		expect(found(src, 'src\\lib\\components\\ui\\a\\a.svelte')).toEqual(['Members']);
	});
});
