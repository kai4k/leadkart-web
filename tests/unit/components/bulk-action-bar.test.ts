import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import BulkActionBar, { type BulkAction } from '#lib/components/data/BulkActionBar.svelte';
import { createBulkSelection } from '#lib/hooks/use-bulk-selection.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const button = (name: string) =>
	[...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.textContent?.trim() === name
	);
const dialog = () => document.body.querySelector('[role="alertdialog"], [role="dialog"]');

function render(onClick = vi.fn()) {
	const selection = createBulkSelection<{ id: string }>();
	selection.toggle('ravi');
	const actions: BulkAction[] = [
		{
			id: 'deactivate',
			label: 'Deactivate',
			variant: 'danger',
			confirm: { title: 'Deactivate selected members?', confirmLabel: 'Deactivate' },
			onClick
		}
	];
	target = document.body.appendChild(document.createElement('div'));
	component = mount(BulkActionBar as never, { target, props: { selection, actions } });
	flushSync();
	return { selection, onClick };
}

describe('BulkActionBar: the confirm dialog belongs to the selection', () => {
	it('closes when the selection is emptied under it, so Confirm cannot send nothing', async () => {
		const { selection, onClick } = render();
		button('Deactivate')!.click();
		flushSync();
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		expect(document.body.textContent).toContain('Deactivate selected members?');
		// the debounced search applied, or the page changed: the scope key cleared the selection
		selection.clear();
		flushSync();
		await vi.waitFor(() => expect(dialog()).toBeNull());
		expect(onClick).not.toHaveBeenCalled();
	});

	it('does not come back on its own when rows are selected again', async () => {
		const { selection } = render();
		button('Deactivate')!.click();
		flushSync();
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		selection.clear();
		flushSync();
		await vi.waitFor(() => expect(dialog()).toBeNull());
		selection.toggle('asha');
		flushSync();
		expect(dialog()).toBeNull();
		expect(button('Deactivate')).toBeDefined();
	});

	it('stays open while the selection is there, and Confirm runs the action', async () => {
		const { onClick } = render();
		button('Deactivate')!.click();
		flushSync();
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		const confirm = [...dialog()!.querySelectorAll<HTMLButtonElement>('button')].find(
			(b) => b.textContent?.trim() === 'Deactivate'
		)!;
		confirm.click();
		await vi.waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
	});
});
