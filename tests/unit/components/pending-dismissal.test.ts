import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
// Real mutation machinery (observers, the MutationCache's one global error toast) against a real
// QueryClient; only the context lookup is replaced.
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc,
		{},
		{ swallowRejections: true }
	)
);
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock
}));
const gw = vi.hoisted(() => ({ globalSuspend: vi.fn() }));
vi.mock('#lib/features/operator/people/api.ts', () => gw);
vi.mock('#lib/features/operator/people/api', () => gw);

import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createQueryClient } from '#lib/api/query-client.ts';
import { ServerError } from '#lib/api/errors.ts';
import GlobalSuspendDialog from '#lib/features/operator/people/components/GlobalSuspendDialog.svelte';

const person = { id: 'p1', email: 'a@b.co' } as unknown as ComponentProps<
	typeof GlobalSuspendDialog
>['person'];

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: ComponentProps<typeof GlobalSuspendDialog>;
const onOpenChange = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ open: true, person, onOpenChange });
	component = mount(GlobalSuspendDialog, { target, props });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const buttonNamed = (name: RegExp) =>
	[...document.querySelectorAll('button')].find((b) => name.test(b.textContent?.trim() ?? ''));
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const submit = () => {
	type(document.querySelector('textarea')!, 'because');
	buttonNamed(/Suspend globally/)!.click();
	flushSync();
};
const pressEscape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};
// a confirmation is an alert dialog (role alertdialog)
const dialogOpen = () => document.querySelector('[role="alertdialog"]') !== null;

describe('a pending save cannot be dismissed into silence', () => {
	it('Escape and Cancel do nothing while the call is in flight, then work again', async () => {
		let reject!: (e: unknown) => void;
		gw.globalSuspend.mockReturnValue(new Promise((_r, rej) => (reject = rej)));
		submit();
		await vi.waitFor(() => expect(gw.globalSuspend).toHaveBeenCalledTimes(1));

		pressEscape();
		buttonNamed(/^Cancel$/)?.click();
		flushSync();
		expect(dialogOpen()).toBe(true);
		expect(onOpenChange).not.toHaveBeenCalledWith(false);

		reject(new ServerError(500, null));
		await vi.waitFor(() => expect(document.body.textContent).toContain('went wrong on our side'));
		pressEscape();
		await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
	});

	it('mounted and visible: the failure is a banner, not a toast', async () => {
		gw.globalSuspend.mockRejectedValue(new ServerError(500, null));
		submit();
		await vi.waitFor(() => expect(document.body.textContent).toContain('went wrong'));
		expect(toastMock.error).not.toHaveBeenCalled();
	});

	it('closed by the parent while pending, then fails: exactly one toast (no silent failure)', async () => {
		let reject!: (e: unknown) => void;
		gw.globalSuspend.mockReturnValue(new Promise((_r, rej) => (reject = rej)));
		submit();
		await vi.waitFor(() => expect(gw.globalSuspend).toHaveBeenCalledTimes(1));

		props.open = false; // the component stays mounted, as in every parent
		flushSync();
		reject(new ServerError(500, null));

		await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
		expect(toastMock.error.mock.calls[0]?.[0]).toBe(
			'Something went wrong on our side. Please try again.'
		);
	});

	it('the reason label says it is audited: Go records the reason with the suspension', () => {
		expect(document.body.textContent).toContain('Reason (required, audited)');
	});
});
