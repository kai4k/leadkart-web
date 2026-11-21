/**
 * G5: the overlay primitives sit on the pane material. Each content element is `material-pane` and no longer
 * `bg-popover`; the scrim is `bg-scrim`; the dialog still has its modal layer; no shadow or ring of its own.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import MaterialHost from '../stubs/MaterialHost.svelte';

let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
});

async function open(which: string) {
	component = mount(MaterialHost, {
		target: document.body.appendChild(document.createElement('div')),
		props: { which } as never
	});
	flushSync();
	await new Promise((r) => setTimeout(r, 30));
	flushSync();
}
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('the pane material on the overlay primitives', () => {
	it.each([
		['dialog', 'dialog-content', 'dialog-overlay'],
		['sheet', 'sheet-content', 'sheet-overlay'],
		['alert-dialog', 'alert-dialog-content', 'alert-dialog-overlay'],
		['popover', 'popover-content', undefined],
		['dropdown-menu', 'dropdown-menu-content', undefined]
	])(
		'%s: content is material-pane, with no bg-popover, shadow or ring; the scrim is bg-scrim',
		async (which, content, overlay) => {
			await open(which);
			const el = slot(content);
			expect(el, content).not.toBeNull();
			const classes = el!.className.split(/\s+/);
			expect(classes).toContain('material-pane');
			expect(classes).toContain('text-popover-foreground');
			for (const gone of ['bg-popover', 'shadow-md', 'shadow-lg', 'ring-1', 'ring-border'])
				expect(classes, gone).not.toContain(gone);
			if (overlay) {
				const scrim = slot(overlay);
				expect(scrim, overlay).not.toBeNull();
				expect(scrim!.className.split(/\s+/)).toContain('bg-scrim');
			}
		}
	);

	it('the dialog keeps its modal layer and the busy-veto-era classes', async () => {
		await open('dialog');
		expect(slot('dialog-content')!.className).toContain('z-(--z-modal)');
		expect(slot('dialog-content')!.className).toContain('rounded-xl');
	});

	it('a menu is above the page layer, not the modal layer', async () => {
		await open('dropdown-menu');
		expect(slot('dropdown-menu-content')!.className).toContain('z-(--z-popover)');
	});
});
