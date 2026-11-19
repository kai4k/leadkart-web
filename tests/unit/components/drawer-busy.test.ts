import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import DrawerHost from '../stubs/DrawerHost.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const onOpenChange = vi.fn();
let props: { open: boolean; busy: boolean; onOpenChange: (o: boolean) => void };

beforeEach(() => {
	vi.clearAllMocks();
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ open: true, busy: true, onOpenChange });
	component = mount(DrawerHost, { target, props });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const press = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};
const closeButton = () =>
	[...document.querySelectorAll('button')].find((b) => b.textContent === 'Close it')!;

describe('Drawer `busy`', () => {
	it('Escape and the Close button do nothing while a save is in flight', () => {
		press();
		closeButton().click();
		flushSync();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
	});

	it('closes normally once the save is over', () => {
		props.busy = false;
		flushSync();
		press();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(props.open).toBe(false);
	});
});
