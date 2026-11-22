import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { ConflictError, ValidationError } from '$api/errors';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import Host from '../stubs/ReasonHost.svelte';

type HostProps = {
	open: boolean;
	confirmText?: string;
	askReason?: boolean;
	onConfirm: (reason: string) => Promise<void>;
	onOpenChange: (open: boolean) => void;
};
let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: HostProps;
const onOpenChange = vi.fn();
const onConfirm = vi.fn<(reason: string) => Promise<void>>();

async function open(over: Partial<HostProps> = {}) {
	props = reactiveProps<HostProps>({ open: true, onConfirm, onOpenChange, ...over });
	component = mount(Host, { target, props });
	flushSync();
	await new Promise((r) => setTimeout(r, 30));
	flushSync();
}
beforeEach(() => {
	vi.clearAllMocks();
	onConfirm.mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const reasonBox = () => document.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!;
const typedBox = () => document.querySelector<HTMLInputElement>('input[name="confirm_text"]')!;
const confirmBtn = () =>
	[
		...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-footer"] button')
	].find((b) => b.textContent?.trim() === 'Suspend')!;
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const escape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};

describe('ReasonConfirmDialog', () => {
	it('the confirm button is disabled while the reason is blank (drift C1), enabled once there is one', async () => {
		await open();
		expect(confirmBtn().disabled).toBe(true);
		type(reasonBox(), '   ');
		expect(confirmBtn().disabled).toBe(true);
		type(reasonBox(), 'billing dispute');
		expect(confirmBtn().disabled).toBe(false);
	});

	it('type-to-confirm: disabled until the typed text is exactly confirmText, and also with an empty reason', async () => {
		await open({ confirmText: 'acme' });
		type(reasonBox(), 'billing dispute');
		expect(confirmBtn().disabled).toBe(true);
		type(typedBox(), 'acm');
		expect(confirmBtn().disabled).toBe(true);
		type(typedBox(), 'acme');
		expect(confirmBtn().disabled).toBe(false);
		type(reasonBox(), '');
		expect(confirmBtn().disabled).toBe(true);
	});

	it('askReason false: no reason field, only the typed name blocks', async () => {
		await open({ askReason: false, confirmText: 'role-x' });
		expect(reasonBox()).toBeNull();
		expect(confirmBtn().disabled).toBe(true);
		type(typedBox(), 'role-x');
		expect(confirmBtn().disabled).toBe(false);
	});

	it('confirming sends the TRIMMED reason, closes itself on success, once', async () => {
		await open();
		type(reasonBox(), '  billing dispute  ');
		confirmBtn().click();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
		expect(onConfirm).toHaveBeenCalledWith('billing dispute');
		expect(onOpenChange).toHaveBeenCalledTimes(1);
	});

	it('a 409 shows the conflict copy in the one banner and stays open', async () => {
		onConfirm.mockRejectedValue(new ConflictError());
		await open();
		type(reasonBox(), 'x');
		confirmBtn().click();
		await vi.waitFor(() =>
			expect(document.querySelector('[data-slot="alert"]')?.textContent).toContain(
				'This tenant is already suspended.'
			)
		);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('a 403 and a 404 say what happened to the noun', async () => {
		onConfirm.mockRejectedValueOnce(Object.assign(new ConflictError(), { status: 403 }));
		await open();
		type(reasonBox(), 'x');
		confirmBtn().click();
		await vi.waitFor(() => expect(document.querySelector('[data-slot="alert"]')).not.toBeNull());
		expect(document.querySelector('[data-slot="alert"]')!.textContent).toContain(
			"You don't have permission to suspend this tenant."
		);
	});

	it('a field error on `reason` shows its message under the field (aria-invalid, described by it), takes focus, and there is no banner', async () => {
		onConfirm.mockRejectedValue(new ValidationError({ reason: 'too_long' }, 422));
		await open();
		type(reasonBox(), 'x');
		confirmBtn().click();
		await vi.waitFor(() => expect(reasonBox().getAttribute('aria-invalid')).toBe('true'));
		const error = document.querySelector('[data-slot="field-error"]');
		expect(error?.textContent).toContain('This is too long.');
		expect(reasonBox().getAttribute('aria-describedby')).toContain(error!.id);
		await vi.waitFor(() => expect(document.activeElement).toBe(reasonBox()));
		expect(document.querySelector('[data-slot="alert"]')).toBeNull();
	});

	it('reopening clears the reason, the typed text and the error', async () => {
		onConfirm.mockRejectedValue(new ConflictError());
		await open({ confirmText: 'acme' });
		type(reasonBox(), 'x');
		type(typedBox(), 'acme');
		confirmBtn().click();
		await vi.waitFor(() => expect(document.querySelector('[data-slot="alert"]')).not.toBeNull());
		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		await new Promise((r) => setTimeout(r, 30));
		flushSync();
		expect(reasonBox().value).toBe('');
		expect(typedBox().value).toBe('');
		expect(document.querySelector('[data-slot="alert"]')).toBeNull();
		expect(confirmBtn().disabled).toBe(true);
	});

	it('Escape is refused while confirming, and works after', async () => {
		let resolve!: () => void;
		onConfirm.mockReturnValue(new Promise<void>((r) => (resolve = r)));
		await open();
		type(reasonBox(), 'x');
		confirmBtn().click();
		flushSync();
		await vi.waitFor(() => expect(onConfirm).toHaveBeenCalled());
		escape();
		expect(onOpenChange).not.toHaveBeenCalled();
		resolve();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	it('a result that lands after close + reopen closes nothing', async () => {
		let resolve!: () => void;
		onConfirm.mockReturnValue(new Promise<void>((r) => (resolve = r)));
		await open();
		type(reasonBox(), 'x');
		confirmBtn().click();
		await vi.waitFor(() => expect(onConfirm).toHaveBeenCalled());
		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		onOpenChange.mockClear();
		resolve();
		await new Promise((r) => setTimeout(r, 30));
		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
