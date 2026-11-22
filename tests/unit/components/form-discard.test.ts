/**
 * A form with unsaved input asks "Discard changes?" before it closes (FormSheet and FormDialog alike): on Cancel, the X,
 * Escape. A clean form closes at once; the question is never asked while a security reset is pending or after a sign-out
 * (the surface just closes); the busy veto still wins while the save is in flight.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import Host from '../stubs/FormSurfaceHost.svelte';
import en from '../../../src/lib/i18n/locales/en.json';
import { releaseLeaveGuards } from '#lib/hooks/use-leave-guard.svelte.ts';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));
const reset = vi.hoisted(() => ({ pending: false }));
vi.mock('#lib/api/hard-reset.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	resetPending: () => reset.pending
}));

type HostProps = {
	surface: 'sheet' | 'dialog';
	open: boolean;
	seed: string;
	guardLeave?: boolean;
	onSubmit: (v: { name: string }) => Promise<void>;
	onOpenChange: (o: boolean) => void;
};

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: HostProps;
const onOpenChange = vi.fn();
const onSubmit = vi.fn<(v: { name: string }) => Promise<void>>();

function setup(surface: 'sheet' | 'dialog', extra: Partial<HostProps> = {}) {
	props = reactiveProps<HostProps>({
		surface,
		open: true,
		seed: 'Asha',
		onSubmit,
		onOpenChange,
		...extra
	});
	component = mount(Host, { target, props });
	flushSync();
}
beforeEach(() => {
	vi.clearAllMocks();
	reset.pending = false;
	releaseLeaveGuards(false);
	onSubmit.mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
	releaseLeaveGuards(false);
});

const input = () => document.querySelector<HTMLInputElement>('input[name="name"]')!;
const type = (v: string) => {
	input().value = v;
	input().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const question = () => document.querySelector('[data-slot="alert-dialog-content"]');
const word = (label: string) =>
	[
		...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-content"] button')
	].find((b) => b.textContent?.trim() === label)!;
const cancel = (surface: string) =>
	[...document.querySelectorAll<HTMLButtonElement>(`[data-slot="${surface}-footer"] button`)].find(
		(b) => b.textContent?.trim() === 'Cancel'
	)!;
const escape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};
const settle = () => new Promise((r) => setTimeout(r, 30));

describe.each(['sheet', 'dialog'] as const)('Discard changes: %s', (surface) => {
	it.each(['Cancel', 'the X', 'Escape'])(
		'a clean form closes at once on %s: no question',
		(way) => {
			setup(surface);
			if (way === 'Cancel') cancel(surface).click();
			else if (way === 'the X')
				document.querySelector<HTMLButtonElement>(`[data-slot="${surface}-close"]`)!.click();
			else escape();
			flushSync();
			expect(onOpenChange).toHaveBeenCalledWith(false);
			expect(question()).toBeNull();
		}
	);

	it('a dirty form asks on Cancel: nothing closes, the question is an alert dialog with Keep editing focused first', async () => {
		setup(surface);
		type('Someone else');
		cancel(surface).click();
		flushSync();
		await vi.waitFor(() => expect(question()).not.toBeNull());
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
		expect(document.body.textContent).toContain(en.form.discard.title);
		expect(document.body.textContent).toContain(en.form.discard.description);
		const buttons = [
			...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-footer"] button')
		];
		expect(buttons.map((b) => b.textContent?.trim())).toEqual([
			en.form.discard.keep,
			en.form.discard.confirm
		]);
		await vi.waitFor(() => expect(document.activeElement).toBe(buttons[0]));
	});

	it('the X and Escape ask too', async () => {
		setup(surface);
		type('Someone else');
		document.querySelector<HTMLButtonElement>(`[data-slot="${surface}-close"]`)!.click();
		flushSync();
		await vi.waitFor(() => expect(question()).not.toBeNull());
		word(en.form.discard.keep).click();
		flushSync();
		await vi.waitFor(() => expect(question()).toBeNull());
		escape();
		await vi.waitFor(() => expect(question()).not.toBeNull());
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('Keep editing: the question goes, the surface stays open with what was typed', async () => {
		setup(surface);
		type('Someone else');
		cancel(surface).click();
		flushSync();
		await vi.waitFor(() => expect(question()).not.toBeNull());
		word(en.form.discard.keep).click();
		flushSync();
		await vi.waitFor(() => expect(question()).toBeNull());
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(input().value).toBe('Someone else');
	});

	it('Discard: the surface closes; reopened it shows the seed, not what was discarded', async () => {
		setup(surface);
		type('Someone else');
		cancel(surface).click();
		flushSync();
		await vi.waitFor(() => expect(question()).not.toBeNull());
		word(en.form.discard.confirm).click();
		flushSync();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
		await vi.waitFor(() => expect(question()).toBeNull());
		props.open = true;
		flushSync();
		await settle();
		expect(input().value).toBe('Asha');
		expect(question()).toBeNull();
	});

	it('typing back to what the form opened with is clean again: it closes without asking', () => {
		setup(surface);
		type('Someone else');
		type('Asha');
		cancel(surface).click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(question()).toBeNull();
	});

	it('a pending security reset: the surface closes, nothing is asked', () => {
		setup(surface);
		type('Someone else');
		reset.pending = true;
		cancel(surface).click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(question()).toBeNull();
	});

	it('after the session ended (sign-out chosen): the surface closes, nothing is asked', () => {
		setup(surface);
		type('Someone else');
		releaseLeaveGuards(true);
		cancel(surface).click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(question()).toBeNull();
	});

	it('guardLeave={false}: closes without asking', () => {
		setup(surface, { guardLeave: false });
		type('Someone else');
		cancel(surface).click();
		flushSync();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(question()).toBeNull();
	});

	it('while the save is in flight the busy veto wins: Escape neither closes nor asks', async () => {
		let release!: () => void;
		onSubmit.mockReturnValue(new Promise<void>((r) => (release = r)));
		setup(surface);
		type('Someone else');
		document.querySelector<HTMLFormElement>('#host-form')!.requestSubmit();
		flushSync();
		await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
		escape();
		await settle();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(question()).toBeNull();
		release();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false)); // the save closes it itself
	});

	it('a save that succeeds closes without asking, though the form was dirty', async () => {
		setup(surface);
		type('Meera');
		document.querySelector<HTMLFormElement>('#host-form')!.requestSubmit();
		flushSync();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
		expect(question()).toBeNull();
	});

	it('closing from outside while the question is open takes the question away', async () => {
		setup(surface);
		type('Someone else');
		cancel(surface).click();
		flushSync();
		await vi.waitFor(() => expect(question()).not.toBeNull());
		props.open = false;
		flushSync();
		await vi.waitFor(() => expect(question()).toBeNull());
	});
});
