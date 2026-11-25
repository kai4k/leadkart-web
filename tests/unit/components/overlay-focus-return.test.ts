import { afterEach, describe, expect, it, vi } from 'vitest';
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

/** The focus-return helper on its own: when it returns focus and, as important, when it must not. */
describe('createFocusReturn', () => {
	const fire = (handler: (e: Event) => void, surface: HTMLElement) => {
		const event = new Event('autofocus', { cancelable: true });
		surface.addEventListener('autofocus', handler, { once: true });
		surface.dispatchEvent(event);
		return event;
	};
	const click = (el: HTMLElement) => el.click();
	const setup = () => {
		document.body.innerHTML =
			'<main id="m" tabindex="-1"><button id="a">a</button><button id="b">b</button></main><div id="surface"><input id="field" /></div>';
		return {
			a: document.getElementById('a') as HTMLElement,
			main: document.getElementById('m') as HTMLElement,
			surface: document.getElementById('surface') as HTMLElement,
			field: document.getElementById('field') as HTMLElement
		};
	};
	const closeTo = async () =>
		(await import('#lib/components/ui/overlay-focus.ts')).createFocusReturn();

	it('returns focus to a clicked control that does not hold focus', async () => {
		const { a, surface } = setup();
		const fr = await closeTo();
		click(a);
		fire(fr.open(), surface);
		expect(fire(fr.close(), surface).defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(a);
	});

	it('leaves a keyboard open to bits-ui: the invoker already holds focus', async () => {
		const { a, surface } = setup();
		const fr = await closeTo();
		a.focus();
		click(a); // Enter / Space on a focused button is a click
		fire(fr.open(), surface);
		expect(fire(fr.close(), surface).defaultPrevented).toBe(false);
	});

	it('a caller preventDefault wins', async () => {
		const { a, surface } = setup();
		const fr = await closeTo();
		click(a);
		fire(fr.open(), surface);
		const event = new Event('autofocus', { cancelable: true });
		surface.addEventListener(
			'autofocus',
			fr.close((e) => e.preventDefault()),
			{ once: true }
		);
		surface.dispatchEvent(event);
		expect(document.activeElement).not.toBe(a);
	});

	it('ignores a click older than a second (a shortcut opened it)', async () => {
		const { a, surface } = setup();
		const fr = await closeTo();
		click(a);
		const now = performance.now();
		const spy = vi.spyOn(performance, 'now').mockReturnValue(now + 1500);
		fire(fr.open(), surface);
		spy.mockRestore();
		expect(fire(fr.close(), surface).defaultPrevented).toBe(false);
	});

	it('does not return to a trigger that left the page', async () => {
		const { a, surface } = setup();
		const fr = await closeTo();
		click(a);
		fire(fr.open(), surface);
		a.remove();
		expect(fire(fr.close(), surface).defaultPrevented).toBe(false);
	});

	it('does not take a control inside the opening surface, nor a tabindex=-1 container, as the invoker', async () => {
		const { surface, main, field } = setup();
		const fr = await closeTo();
		const inside = surface.appendChild(document.createElement('button'));
		click(inside);
		fire(fr.open(), surface);
		expect(fire(fr.close(), surface).defaultPrevented).toBe(false);
		click(main); // not a control: tabindex -1
		fire(fr.open(), surface);
		expect(fire(fr.close(), surface).defaultPrevented).toBe(false);
		expect(field).not.toBe(document.activeElement);
	});

	it('a nested overlay opened from a sheet returns to the clicked control, not the sheet field', async () => {
		const { a, surface, field } = setup();
		const fr = await closeTo();
		field.focus(); // the surface below holds focus on a field
		click(a);
		fire(fr.open(), surface);
		fire(fr.close(), surface);
		expect(document.activeElement).toBe(a);
	});
});
