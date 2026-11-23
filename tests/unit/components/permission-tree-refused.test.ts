/**
 * The role editor does not OFFER `identity.users.create` to a role below the Administrator tier: Go refuses it
 * (`admin_tier_required`, owner ruling 2026-11-21). The tree takes the refusals as data (name -> reason): the
 * checkbox is disabled, the reason is read with it, and no toggle (single or group) can select it.
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
import { isBelowAdminTier } from '#lib/features/auth/permissions.ts';
import { PERMISSION_CATALOGUE } from '#lib/features/roles/permissions-catalogue.ts';

let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
});

const NAME = 'identity.users.create';
const REASON = 'Only the Administrator tier and above can add users.';

function render(refused: Record<string, string> | undefined, selected: string[] = []) {
	const onChange = vi.fn();
	component = mount(PermissionTree, {
		target: document.body,
		props: { selected, onChange, refused }
	});
	flushSync();
	return onChange;
}
const box = () => document.querySelector<HTMLInputElement>(`input[aria-label="${NAME}"]`)!;

describe('a refused permission', () => {
	it('is disabled, explains itself through aria-describedby, and cannot be toggled', () => {
		const onChange = render({ [NAME]: REASON });
		expect(box().disabled).toBe(true);
		const id = box().getAttribute('aria-describedby')!;
		expect(document.getElementById(id)!.textContent).toBe(REASON);
		box().click();
		flushSync();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('is skipped by its group toggle', () => {
		const onChange = render({ [NAME]: REASON });
		const group = document.querySelector<HTMLInputElement>(
			'input[aria-label="Toggle all identity permissions"]'
		)!;
		group.click();
		flushSync();
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0]![0]).not.toContain(NAME);
		expect(onChange.mock.calls[0]![0].length).toBeGreaterThan(0);
	});

	it('its group reads "all" once every ALLOWED name is selected, and the toggle then clears them', () => {
		const names = PERMISSION_CATALOGUE.filter((e) => e.group === 'identity').map((e) => e.name);
		const allowed = names.filter((n) => n !== NAME);
		const onChange = render({ [NAME]: REASON }, allowed);
		const group = document.querySelector<HTMLInputElement>(
			'input[aria-label="Toggle all identity permissions"]'
		)!;
		// it used to be stuck on "some" for ever, so a click could only add
		expect(group.checked).toBe(true);
		expect(group.indeterminate).toBe(false);
		group.click();
		flushSync();
		expect(onChange.mock.calls[0]![0]).toEqual([]);
	});

	it('a refused name that is already selected keeps its state when the group is cleared', () => {
		const names = PERMISSION_CATALOGUE.filter((e) => e.group === 'identity').map((e) => e.name);
		const onChange = render({ [NAME]: REASON }, names);
		document
			.querySelector<HTMLInputElement>('input[aria-label="Toggle all identity permissions"]')!
			.click();
		flushSync();
		expect(onChange.mock.calls[0]![0]).toEqual([NAME]);
	});

	it('a group with no name the caller may change cannot be toggled', () => {
		const refused = Object.fromEntries(
			PERMISSION_CATALOGUE.filter((e) => e.group === 'platform').map((e) => [e.name, REASON])
		);
		const onChange = render(refused);
		const group = document.querySelector<HTMLInputElement>(
			'input[aria-label="Toggle all platform permissions"]'
		)!;
		expect(group.disabled).toBe(true);
		expect(group.checked).toBe(false);
		group.click();
		flushSync();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('is offered normally when nothing is refused', () => {
		render(undefined);
		expect(box().disabled).toBe(false);
		expect(box().getAttribute('aria-describedby')).toBeNull();
	});
});

describe('the Administrator tier (spec: Capabilities.tier, admin = rank 1-10, owner 0)', () => {
	it.each([
		[0, false],
		[1, false],
		[10, false],
		[11, true],
		[99, true]
	])('rank %i below the tier: %s', (rank, below) => {
		expect(isBelowAdminTier(rank)).toBe(below);
	});
});
