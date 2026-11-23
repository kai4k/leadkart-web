import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';

const h = vi.hoisted(() => ({ qc: undefined as unknown as QueryClient }));
// Real mutation machinery against a real QueryClient; only the context lookup is replaced.
vi.mock('@tanstack/svelte-query', async (importOriginal) =>
	(await import('../helpers/real-mutations.svelte.ts')).withRealMutations(
		await importOriginal(),
		() => h.qc
	)
);
const toastMock = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('$ui', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: toastMock
}));
const gw = vi.hoisted(() => ({ createPermissionRequest: vi.fn() }));
vi.mock('#lib/features/permission-requests/api.ts', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	...gw
}));

import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { createQueryClient } from '#lib/api/query-client.ts';
import CreatePermissionRequestDrawer from '#lib/features/permission-requests/components/CreatePermissionRequestDrawer.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: ComponentProps<typeof CreatePermissionRequestDrawer>;
let invalidate: ReturnType<typeof vi.spyOn>;
const onOpenChange = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	h.qc = createQueryClient();
	invalidate = vi.spyOn(h.qc, 'invalidateQueries').mockResolvedValue(undefined);
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ open: true, onOpenChange });
	component = mount(CreatePermissionRequestDrawer, { target, props });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const submit = () => {
	const permission = document.querySelector<HTMLSelectElement>('select[name="permission"]')!;
	permission.value = 'identity.users.view';
	permission.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
	type(document.querySelector('textarea')!, 'I need this to do the monthly audit');
	document.querySelector<HTMLFormElement>('#create-permission-request-form')!.requestSubmit();
	flushSync();
};
const pressEscape = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};

describe('a form drawer settles even when its mutation observer was detached', () => {
	it('parent closes it while the save is pending: after the result it is not stuck busy on reopen', async () => {
		let resolve!: (v: unknown) => void;
		gw.createPermissionRequest.mockReturnValue(new Promise((r) => (resolve = r)));
		submit();
		await vi.waitFor(() => expect(gw.createPermissionRequest).toHaveBeenCalledTimes(1));

		props.open = false; // the reset-on-close backstop detaches the observer
		flushSync();
		props.open = true; // reopened
		flushSync();
		resolve({ id: 'r1' });
		await vi.waitFor(() => expect(toastMock.success).toHaveBeenCalled());

		onOpenChange.mockClear();
		pressEscape();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('detached success: exactly one invalidation and one success toast', async () => {
		let resolve!: (v: unknown) => void;
		gw.createPermissionRequest.mockReturnValue(new Promise((r) => (resolve = r)));
		submit();
		await vi.waitFor(() => expect(gw.createPermissionRequest).toHaveBeenCalledTimes(1));

		props.open = false;
		flushSync();
		resolve({ id: 'r1' });
		await vi.waitFor(() => expect(toastMock.success).toHaveBeenCalledTimes(1));
		await Promise.resolve();

		expect(toastMock.success).toHaveBeenCalledWith('Request submitted', undefined);
		expect(invalidate).toHaveBeenCalledTimes(1);
	});
});

describe('a result from a previous open never lands in the reopened drawer', () => {
	it('late SUCCESS after close + reopen does not close the new open (its edits survive)', async () => {
		let resolve!: (v: unknown) => void;
		gw.createPermissionRequest.mockReturnValue(new Promise((r) => (resolve = r)));
		submit();
		await vi.waitFor(() => expect(gw.createPermissionRequest).toHaveBeenCalledTimes(1));

		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		onOpenChange.mockClear();
		resolve({ id: 'r1' });
		await vi.waitFor(() => expect(toastMock.success).toHaveBeenCalled()); // the toast still reports it
		await Promise.resolve();

		expect(onOpenChange).not.toHaveBeenCalledWith(false);
	});

	it('late FAILURE after close + reopen shows no banner in the new open (the toast still reports it)', async () => {
		let reject!: (e: unknown) => void;
		gw.createPermissionRequest.mockReturnValue(new Promise((_r, j) => (reject = j)));
		submit();
		await vi.waitFor(() => expect(gw.createPermissionRequest).toHaveBeenCalledTimes(1));

		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		reject(new Error('boom'));
		await vi.waitFor(() => expect(toastMock.error).toHaveBeenCalled());
		await Promise.resolve();

		expect(document.querySelector('[role="alert"]')).toBeNull();
	});
});
