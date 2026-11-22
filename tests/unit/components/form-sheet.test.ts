import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { ConflictError, ValidationError } from '$api/errors';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { beforeNavigate } from '$app/navigation';
import Host from '../stubs/FormSurfaceHost.svelte';
import en from '../../../src/lib/i18n/locales/en.json';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));

type HostProps = {
	surface: 'sheet' | 'dialog';
	open: boolean;
	seed: string;
	onSubmit: (v: { name: string }) => Promise<void>;
	onOpenChange: (o: boolean) => void;
};

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: HostProps;
const onOpenChange = vi.fn();
const onSubmit = vi.fn<(v: { name: string }) => Promise<void>>();

function setup(surface: 'sheet' | 'dialog') {
	props = reactiveProps<HostProps>({ surface, open: true, seed: 'Asha', onSubmit, onOpenChange });
	component = mount(Host, { target, props });
	flushSync();
}
beforeEach(() => {
	vi.clearAllMocks();
	onSubmit.mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const input = () => document.querySelector<HTMLInputElement>('input[name="name"]')!;
const type = (v: string) => {
	input().value = v;
	input().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const formEl = () => document.querySelector<HTMLFormElement>('#host-form')!;
const submit = () => {
	formEl().requestSubmit();
	flushSync();
};
const escape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};

describe.each(['sheet', 'dialog'] as const)('Form surface: %s', (surface) => {
	beforeEach(() => setup(surface));

	it('(a) resets from initial() on every open: a changed seed shows, with no error', async () => {
		type('');
		submit();
		await vi.waitFor(() => expect(input().getAttribute('aria-invalid')).toBe('true'));
		props.open = false;
		flushSync();
		props.seed = 'Ravi';
		props.open = true;
		flushSync();
		await vi.waitFor(() => expect(input().value).toBe('Ravi'));
		expect(input().getAttribute('aria-invalid')).not.toBe('true');
		expect(document.body.textContent).not.toContain(en.form.required);
	});

	it('(b) a resolving submit calls onSubmit with the parsed values and closes once', async () => {
		type('Meera');
		submit();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
		expect(onSubmit).toHaveBeenCalledWith({ name: 'Meera' });
		expect(onOpenChange).toHaveBeenCalledTimes(1);
	});

	it('(c) a rejecting submit shows the describeError text in the one banner and stays open', async () => {
		onSubmit.mockRejectedValue(new ConflictError());
		submit();
		await vi.waitFor(() =>
			expect(document.querySelector('[data-slot="alert"]')?.textContent).toContain('conflicts')
		);
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(document.querySelectorAll('[data-slot="alert"]')).toHaveLength(1);
	});

	it('a server field error shows on its field as a message (a code is never shown raw) and takes focus', async () => {
		onSubmit.mockRejectedValue(new ValidationError({ name: 'invalid_characters' }, 422));
		submit();
		await vi.waitFor(() => expect(input().getAttribute('aria-invalid')).toBe('true'));
		expect(document.body.textContent).toContain('Remove the characters that are not allowed.');
		expect(document.body.textContent).not.toContain('invalid_characters');
		await vi.waitFor(() => expect(document.activeElement).toBe(input()));
	});

	it('(d) while onSubmit is pending, Escape does not close', async () => {
		let resolve!: () => void;
		onSubmit.mockReturnValue(new Promise<void>((r) => (resolve = r)));
		submit();
		await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
		escape();
		expect(onOpenChange).not.toHaveBeenCalled();
		resolve();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	it('(e) a submit that resolves after close + reopen does not close the reopened surface', async () => {
		let resolve!: () => void;
		onSubmit.mockReturnValue(new Promise<void>((r) => (resolve = r)));
		submit();
		await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		onOpenChange.mockClear();
		resolve();
		await new Promise((r) => setTimeout(r, 30));
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('(f) the submit button is wired by form={formId}, sits in the footer, and no button is inside a button', () => {
		const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		expect(submitBtn.getAttribute('form')).toBe('host-form');
		expect(submitBtn.textContent).toContain('Save person');
		expect(document.querySelectorAll('button button')).toHaveLength(0);
		const content = document.querySelector(`[data-slot="${surface}-content"]`)!;
		expect(content.querySelector(`[data-slot="${surface}-footer"]`)!.contains(submitBtn)).toBe(
			true
		);
	});

	it('the content is the material pane and nothing inside it is another material (no glass on glass)', () => {
		const content = document.querySelector(`[data-slot="${surface}-content"]`)!;
		expect(content.classList.contains('material-pane')).toBe(true);
		const inner = [...content.querySelectorAll('*')].filter((el) =>
			[...el.classList].some((c) => c.startsWith('material-'))
		);
		expect(inner).toEqual([]);
	});

	it('leaving the page with unsaved input asks; an untouched form, a closed one and a guardLeave-free one do not', () => {
		const nav = () => ({ cancel: vi.fn(), type: 'link', willUnload: false });
		const guard = vi.mocked(beforeNavigate).mock.calls.at(-1)![0] as (n: unknown) => void;
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const clean = nav();
		guard(clean);
		expect(clean.cancel).not.toHaveBeenCalled(); // opened with the seed: not dirty
		type('Someone else');
		const dirty = nav();
		guard(dirty);
		expect(dirty.cancel).toHaveBeenCalledOnce();
		props.open = false;
		flushSync();
		const closed = nav();
		guard(closed);
		expect(closed.cancel).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it('Cancel comes before Submit and closes the surface', () => {
		const buttons = [
			...document.querySelectorAll<HTMLButtonElement>(`[data-slot="${surface}-footer"] button`)
		];
		expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Cancel', 'Save person']);
		buttons[0]!.click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
