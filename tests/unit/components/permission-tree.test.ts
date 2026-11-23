/**
 * PermissionTree: labelled checkbox groups, not an ARIA tree. Each catalogue group is a fieldset named by
 * its legend; the group checkbox is tri-state (`aria-checked="mixed"` when some of its names are on).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
// The info tooltips need a Tooltip.Provider the test does not mount.
vi.mock('$ui', async (importOriginal) => {
	const stub = (await import('../stubs/Empty.svelte')).default;
	return {
		...(await importOriginal<Record<string, unknown>>()),
		Tooltip: Object.fromEntries(['Root', 'Trigger', 'Content', 'Provider'].map((n) => [n, stub]))
	};
});
import PermissionTree from '#lib/features/roles/components/PermissionTree.svelte';
import { PERMISSION_CATALOGUE } from '#lib/features/roles/permissions-catalogue.ts';

let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
});

const META = PERMISSION_CATALOGUE.filter((e) => e.group === 'meta').map((e) => e.name);

function render(selected: string[] = []) {
	const onChange = vi.fn();
	component = mount(PermissionTree, { target: document.body, props: { selected, onChange } });
	flushSync();
	return onChange;
}
const fieldset = (name: string) =>
	[...document.querySelectorAll('fieldset')].find(
		(f) => f.querySelector('legend')?.textContent?.trim() === name
	)!;
const groupBox = (name: string) =>
	document.querySelector<HTMLElement>(
		`button[role="checkbox"][aria-label="Toggle all ${name} permissions"]`
	)!;
const nameBox = (name: string) =>
	document.querySelector<HTMLElement>(`button[role="checkbox"][aria-label="${name}"]`)!;

describe('PermissionTree structure', () => {
	it('every group is a fieldset named by its legend, and there is no role="tree"', () => {
		render();
		const groups = new Set(PERMISSION_CATALOGUE.map((e) => e.group));
		expect(document.querySelectorAll('fieldset')).toHaveLength(groups.size);
		for (const g of groups) expect(fieldset(g), g).toBeTruthy();
		expect(document.querySelector('[role="tree"]')).toBeNull();
		expect(document.querySelector('[role="group"]:not(fieldset)')).toBeNull();
	});

	it('uses the library checkbox, not a raw input', () => {
		render();
		expect(document.querySelector('input[type="checkbox"]')).toBeNull();
		expect(nameBox(META[0]!)).toBeTruthy();
	});
});

describe('the group checkbox is tri-state', () => {
	it('reads unchecked with nothing on, mixed with some on, checked with all on', () => {
		render();
		expect(groupBox('meta').getAttribute('aria-checked')).toBe('false');
		unmount(component!);
		render([META[0]!]);
		expect(groupBox('meta').getAttribute('aria-checked')).toBe('mixed');
		unmount(component!);
		render(META);
		expect(groupBox('meta').getAttribute('aria-checked')).toBe('true');
	});

	it('checking one of two children makes the group mixed (the page feeds the change back)', () => {
		expect(META.length).toBeGreaterThanOrEqual(2);
		const onChange = render();
		nameBox(META[0]!).click();
		flushSync();
		expect(onChange).toHaveBeenCalledWith([META[0]]);
	});

	it('checking the group checks all its children; a full group clears them', () => {
		const onChange = render();
		groupBox('meta').click();
		flushSync();
		expect(new Set(onChange.mock.calls[0]![0])).toEqual(new Set(META));
		unmount(component!);
		const clear = render(META);
		groupBox('meta').click();
		flushSync();
		expect(clear.mock.calls[0]![0]).toEqual([]);
	});

	it('a mixed group, when clicked, selects the rest', () => {
		const onChange = render([META[0]!]);
		groupBox('meta').click();
		flushSync();
		expect(new Set(onChange.mock.calls[0]![0])).toEqual(new Set(META));
	});
});
