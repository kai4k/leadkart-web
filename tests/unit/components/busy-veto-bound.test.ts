import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { DEFAULT_READ_TIMEOUT_MS } from '#lib/api/timeouts.ts';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import DialogHost from '../stubs/DialogHost.svelte';
import DrawerHost from '../stubs/DrawerHost.svelte';

const sonner = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('svelte-sonner', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	toast: sonner.toast
}));

const NOT_CONFIRMED = "We couldn't confirm this was saved. Refresh to check.";

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const onOpenChange = vi.fn();
let props: { open: boolean; busy: boolean; onOpenChange: (o: boolean) => void };

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
	vi.useRealTimers();
});

const press = () => {
	document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	flushSync();
};
const closeButton = () =>
	[...document.querySelectorAll('button')].find((b) => b.textContent === 'Close it')!;
const wait = async (ms: number) => {
	await vi.advanceTimersByTimeAsync(ms);
	flushSync();
};

describe.each([
	['Dialog', DialogHost],
	['Drawer', DrawerHost]
] as const)('%s busy veto is bounded', (_name, Host) => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		target = document.body.appendChild(document.createElement('div'));
		props = reactiveProps({ open: true, busy: true, onOpenChange });
		component = mount(Host, { target, props });
		flushSync();
	});

	it('vetoes dismissal before the read timeout, silently', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS - 1000);
		press();
		closeButton().click();
		flushSync();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(sonner.toast).not.toHaveBeenCalled();
	});

	it('after the read timeout of continuous busy, dismissal works and says one neutral line', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS + 1);
		press();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(sonner.toast).toHaveBeenCalledTimes(1);
		expect(sonner.toast).toHaveBeenCalledWith(NOT_CONFIRMED);
	});

	it('the line is never a failure message', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS + 1);
		press();
		expect(JSON.stringify(sonner.toast.mock.calls)).not.toMatch(/fail/i);
	});

	it('a save that ends restarts the clock: the next save is vetoed again', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS - 1000);
		props.busy = false;
		flushSync();
		props.busy = true;
		flushSync();
		await wait(DEFAULT_READ_TIMEOUT_MS - 1000);
		press();
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('a normal close after the save ends says nothing', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS + 1);
		props.busy = false;
		flushSync();
		press();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(sonner.toast).not.toHaveBeenCalled();
	});

	it('reopened after the expiry while the save is STILL busy: the bound is over, so it is not trapped again', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS + 1);
		press();
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		props.open = false;
		flushSync();
		props.open = true; // the same save is still in flight
		flushSync();
		onOpenChange.mockClear();
		sonner.toast.mockClear();

		press();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(sonner.toast).toHaveBeenCalledWith(NOT_CONFIRMED);
	});

	it('reopened BEFORE the expiry while busy: still vetoed until the bound from the save start', async () => {
		await wait(DEFAULT_READ_TIMEOUT_MS - 1000);
		props.open = false;
		flushSync();
		props.open = true;
		flushSync();
		press();
		expect(onOpenChange).not.toHaveBeenCalled();
		await wait(1001);
		press();
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
