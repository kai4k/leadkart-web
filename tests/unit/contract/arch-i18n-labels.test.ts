import { describe, expect, it } from 'vitest';
import {
	LABEL_ALLOWLIST,
	LABEL_ALLOWLIST_ENTRIES,
	LEGACY_DATA_TABLE_REBUILT,
	checkLabelAllowlist,
	findHardcodedLabels,
	isFormatString
} from '../../../scripts/arch/lib/hardcoded-labels.mjs';

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

describe('hard-coded labels: format strings and the allowlist expiry (fix round B)', () => {
	it.each(['DD/MM/YYYY', 'dd-mm-yyyy', 'HH:mm', 'MM/DD/YY', 'YYYY-MM-DD HH:mm'])(
		'a non-linguistic format placeholder %s is not a label',
		(fmt) => {
			expect(found(`<input placeholder="${fmt}" />`, 'src/lib/components/form/D.svelte')).toEqual(
				[]
			);
			expect(isFormatString(fmt)).toBe(true);
		}
	);
	it.each(['Date', 'Day', 'Dismiss', 'Search', 'mm hours', 'DD of the month'])(
		'a word (%s) is still a label',
		(text) => {
			expect(isFormatString(text)).toBe(false);
			expect(found(`<input placeholder="${text}" />`, 'src/lib/components/form/D.svelte')).toEqual([
				text
			]);
		}
	);

	it('the legacy data-table entry carries its owner and an end', () => {
		expect(LABEL_ALLOWLIST_ENTRIES).toEqual([
			expect.objectContaining({
				path: 'src/lib/components/ui/data-table/',
				owner: 'Task 23'
			})
		]);
		expect(LABEL_ALLOWLIST).toEqual(LABEL_ALLOWLIST_ENTRIES.map((e: { path: string }) => e.path));
	});
	it('passes while the directory exists and the marker says it is still needed', () => {
		expect(checkLabelAllowlist(() => true, false)).toEqual([]);
	});
	it('FAILS once the directory is gone, so the entry cannot outlive its reason', () => {
		const problems = checkLabelAllowlist(() => false, false);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('src/lib/components/ui/data-table/');
		expect(problems[0]).toContain('Task 23');
	});
	it('FAILS once the marker constant is flipped, even if the directory is still there', () => {
		expect(checkLabelAllowlist(() => true, true)).toHaveLength(1);
		expect(LEGACY_DATA_TABLE_REBUILT).toBe(false);
	});
});
