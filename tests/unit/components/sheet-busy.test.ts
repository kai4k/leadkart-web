import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import SheetHost from '../stubs/SheetHost.svelte';

/**
 * Review focus 2: leaving a form surface while its save is in flight. The Sheet carries the same
 * busy veto as Dialog (one `createBusyVeto`): Escape, the Close buttons (the built-in X and a
 * Sheet.Close) and an outside press are all refused while `busy`, and work once the save is over.
 */

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const onOpenChange = vi.fn();
let props: { open: boolean; busy: boolean; onOpenChange: (o: boolean) => void };

beforeEach(() => {
	vi.clearAllMocks();
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ open: true, busy: true, onOpenChange });
	component = mount(SheetHost, { target, props });
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
const builtInClose = () =>
	[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Close')!;
// bits-ui settles an outside press 10ms after the pointerdown (a debounce), so wait it out.
const pressOutside = async () => {
	const init = {
		bubbles: true,
		cancelable: true,
		pointerType: 'mouse',
		button: 0,
		clientX: 500,
		clientY: 500
	};
	document.body.dispatchEvent(new PointerEvent('pointerdown', init));
	document.body.dispatchEvent(new PointerEvent('pointerup', init));
	document.body.dispatchEvent(new MouseEvent('click', init));
	await new Promise((resolve) => setTimeout(resolve, 40));
	flushSync();
};

describe('Sheet `busy`', () => {
	it('Escape does nothing while a save is in flight', () => {
		press();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
	});

	it('both Close controls do nothing while a save is in flight', () => {
		closeButton().click();
		builtInClose().click();
		flushSync();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
	});

	it('an outside press does nothing while a save is in flight', async () => {
		await pressOutside();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
	});

	it('closes by Escape once the save is over', () => {
		props.busy = false;
		flushSync();
		press();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(props.open).toBe(false);
	});

	it('closes by the Close button once the save is over', () => {
		props.busy = false;
		flushSync();
		closeButton().click();
		flushSync();
		expect(props.open).toBe(false);
	});

	it('closes by an outside press once the save is over', async () => {
		props.busy = false;
		flushSync();
		await pressOutside();
		expect(props.open).toBe(false);
	});

	it('renders the side it was given on the content', () => {
		expect(document.querySelector('[data-slot="sheet-content"]')?.getAttribute('data-side')).toBe(
			'right'
		);
	});
});
