import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import DialogHost from '../stubs/DialogHost.svelte';
import DrawerHost from '../stubs/DrawerHost.svelte';
import SheetHost from '../stubs/SheetHost.svelte';

/**
 * Review focus 2, for every form surface that exists after the swap (Dialog, Sheet, and the Drawer
 * shim the leads / orders / inventory forms still use): an outside press is refused while a save
 * is in flight and honoured after it; reopening shows what a fresh open shows, not the last open's
 * typed value. (Escape and the Close controls are in drawer-busy, sheet-busy and busy-veto-bound.)
 */

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const onOpenChange = vi.fn();
let props: {
	open: boolean;
	busy: boolean;
	onOpenChange: (o: boolean) => void;
	direction?: 'left';
	dismissible?: boolean;
};

const mountHost = (Host: typeof DialogHost, extra: object = {}) => {
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ open: true, busy: true, onOpenChange, ...extra });
	component = mount(Host, { target, props });
	flushSync();
};
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
	vi.clearAllMocks();
});

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
const escape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};
const field = () => document.querySelector<HTMLInputElement>('input[aria-label="Name"]');

describe.each([
	['Dialog', DialogHost],
	['Sheet', SheetHost],
	['Drawer shim', DrawerHost]
] as const)('%s', (_name, Host) => {
	beforeEach(() => mountHost(Host as typeof DialogHost));

	it('refuses an outside press while a save is in flight', async () => {
		await pressOutside();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
		expect(field()).not.toBeNull();
	});

	it('honours an outside press once the save is over', async () => {
		props.busy = false;
		flushSync();
		await pressOutside();
		expect(props.open).toBe(false);
		expect(field()).toBeNull();
	});

	it('the content unmounts on close, so an uncontrolled field starts empty on reopen (a bound field is reset on open by the form layer, Task 18)', async () => {
		props.busy = false;
		flushSync();
		field()!.value = 'typed before leaving';
		field()!.dispatchEvent(new Event('input', { bubbles: true }));
		escape();
		expect(props.open).toBe(false);
		await new Promise((resolve) => setTimeout(resolve, 40)); // the closed content unmounts
		expect(field()).toBeNull();
		props.open = true;
		flushSync();
		expect(field()).not.toBeNull();
		expect(field()!.value).toBe('');
	});
});

describe('Drawer shim: the vaul props it still accepts', () => {
	it('direction picks the side', () => {
		mountHost(DrawerHost as unknown as typeof DialogHost, { direction: 'left' });
		expect(document.querySelector('[data-slot="sheet-content"]')?.getAttribute('data-side')).toBe(
			'left'
		);
	});
	it('defaults to the right edge', () => {
		mountHost(DrawerHost as unknown as typeof DialogHost);
		expect(document.querySelector('[data-slot="sheet-content"]')?.getAttribute('data-side')).toBe(
			'right'
		);
	});
	it('dismissible={false} refuses Escape and an outside press even when not busy', async () => {
		mountHost(DrawerHost as unknown as typeof DialogHost, { dismissible: false });
		props.busy = false;
		flushSync();
		escape();
		await pressOutside();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(props.open).toBe(true);
	});
});
