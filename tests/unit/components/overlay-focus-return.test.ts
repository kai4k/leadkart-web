import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import FocusReturnHost from '../stubs/FocusReturnHost.svelte';

/**
 * WebKit does not focus a button on a mouse click, so bits-ui has no focused element to restore on
 * close. jsdom behaves the same way (`click()` never focuses), which makes it a faithful stand-in:
 * the shared Dialog, Sheet and AlertDialog content must return focus to the control that was clicked.
 */

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe.each(['dialog', 'sheet', 'alert-dialog'] as const)('%s focus return', (kind) => {
	it('returns focus to a clicked trigger that was never focused', async () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(FocusReturnHost, { target, props: { kind } });
		flushSync();
		const invoker = target.querySelector<HTMLButtonElement>('[data-testid="invoker"]')!;
		expect(document.activeElement).toBe(document.body);
		invoker.click();
		flushSync();
		await wait(50);
		expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).not.toBeNull();

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();
		await wait(100);
		flushSync();
		expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull();
		expect(document.activeElement).toBe(invoker);
	});
});
