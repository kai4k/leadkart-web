import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import Host from '../stubs/ConfirmHost.svelte';

/**
 * ConfirmDialog is an alert dialog: role alertdialog, Cancel first in the DOM and focused, an outside press does not
 * dismiss it, Escape and Cancel close it unless the action is in flight, a destructive confirm is the destructive button.
 */

type HostProps = {
	open: boolean;
	variant: 'default' | 'info' | 'warning' | 'danger';
	loading: boolean;
	confirmDisabled: boolean;
	onConfirm: () => void | Promise<void>;
	onOpenChange: (open: boolean) => void;
};
let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: HostProps;
const onOpenChange = vi.fn();
const onConfirm = vi.fn();

async function open(over: Partial<HostProps> = {}) {
	props = reactiveProps<HostProps>({
		open: true,
		variant: 'danger',
		loading: false,
		confirmDisabled: false,
		onConfirm,
		onOpenChange,
		...over
	});
	component = mount(Host, { target, props });
	flushSync();
	await new Promise((r) => setTimeout(r, 30));
	flushSync();
}
beforeEach(() => {
	vi.clearAllMocks();
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const content = () => document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
const buttons = () => [
	...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-footer"] button')
];
const escape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};

describe('ConfirmDialog on the alert-dialog primitive', () => {
	it('is an alertdialog, the milk material, over the scrim; the title names it', async () => {
		await open();
		expect(content().getAttribute('role')).toBe('alertdialog');
		expect(content().className).toContain('material-milk');
		expect(document.querySelector('[data-slot="alert-dialog-overlay"]')!.className).toContain(
			'bg-scrim'
		);
		expect(content().getAttribute('aria-labelledby')).toBeTruthy();
	});

	it('Cancel comes first in the DOM and has focus; the confirm is the destructive button for a danger variant', async () => {
		await open();
		const [cancel, confirm] = buttons();
		expect(cancel!.textContent?.trim()).toBe('Cancel');
		expect(confirm!.textContent?.trim()).toBe('Delete it');
		expect(document.activeElement).toBe(cancel);
		expect(confirm!.className).toContain('destructive');
	});

	it('a non-danger variant confirms with the default button', async () => {
		await open({ variant: 'warning' });
		expect(buttons()[1]!.className).not.toContain('bg-destructive');
	});

	it('Confirm calls onConfirm and does NOT close by itself (the caller closes when the action succeeded)', async () => {
		await open();
		buttons()[1]!.click();
		flushSync();
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('Escape and Cancel close it', async () => {
		await open();
		escape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		onOpenChange.mockClear();
		props.open = true;
		flushSync();
		buttons()[0]!.click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('an outside press does not dismiss it', async () => {
		await open();
		const init = {
			bubbles: true,
			cancelable: true,
			pointerType: 'mouse',
			button: 0,
			clientX: 3,
			clientY: 3
		};
		document.body.dispatchEvent(new PointerEvent('pointerdown', init));
		document.body.dispatchEvent(new PointerEvent('pointerup', init));
		document.body.dispatchEvent(new MouseEvent('click', init));
		await new Promise((r) => setTimeout(r, 40));
		flushSync();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
		expect(content()).not.toBeNull();
	});

	it('while the action is in flight (loading) Escape and Cancel refuse to close it', async () => {
		await open({ loading: true });
		escape();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(buttons()[0]!.disabled).toBe(true);
	});

	it('confirmDisabled renders a disabled confirm action that does nothing', async () => {
		await open({ confirmDisabled: true });
		const confirm = buttons()[1]!;
		expect(confirm.disabled).toBe(true);
		confirm.click();
		flushSync();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
