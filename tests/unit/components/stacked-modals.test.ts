import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import StackedHost from '../stubs/StackedHost.svelte';
import { assertOverlayName } from '#lib/components/ui/overlay-name.ts';

/**
 * A modal opened over another modal (a confirm over a form sheet) must cover it: its scrim sits above
 * the first panel, and an outside press on the first panel dismisses only the second. Scrims take
 * the modal layer too, so DOM order (portal order = open order) decides who is on top.
 */

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: { sheetOpen: boolean; dialogOpen: boolean };

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

async function open() {
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps({ sheetOpen: true, dialogOpen: false });
	component = mount(StackedHost, { target, props });
	flushSync();
	await new Promise((resolve) => setTimeout(resolve, 30));
	// the second modal opens while the first is already open
	props.dialogOpen = true;
	flushSync();
	await new Promise((resolve) => setTimeout(resolve, 30));
	flushSync();
}

describe('stacked modals', () => {
	it('every scrim and every panel is on the modal layer, none on the old overlay layer', async () => {
		await open();
		for (const name of ['sheet-overlay', 'dialog-overlay', 'sheet-content', 'dialog-content']) {
			const el = slot(name);
			expect(el, name).not.toBeNull();
			expect(el!.className).toContain('z-(--z-modal)');
			expect(el!.className).not.toContain('z-(--z-overlay)');
		}
	});

	it('the second scrim comes after the first panel in the document, so it covers it', async () => {
		await open();
		const firstPanel = slot('sheet-content')!;
		const secondScrim = slot('dialog-overlay')!;
		const secondPanel = slot('dialog-content')!;
		expect(
			firstPanel.compareDocumentPosition(secondScrim) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(
			secondScrim.compareDocumentPosition(secondPanel) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it('a press where the first panel is, which lands on the second scrim, closes only the second modal', async () => {
		await open();
		// In a browser the second scrim covers the first panel, so that is where the press lands.
		const scrim = slot('dialog-overlay')!;
		const init = {
			bubbles: true,
			cancelable: true,
			pointerType: 'mouse',
			button: 0,
			clientX: 500,
			clientY: 500
		};
		scrim.dispatchEvent(new PointerEvent('pointerdown', init));
		scrim.dispatchEvent(new PointerEvent('pointerup', init));
		scrim.dispatchEvent(new MouseEvent('click', init));
		await new Promise((resolve) => setTimeout(resolve, 40));
		flushSync();
		expect(props.dialogOpen).toBe(false);
		expect(props.sheetOpen).toBe(true);
	});
});

describe('an overlay needs an accessible name', () => {
	const el = (attrs: Record<string, string> = {}) => {
		const node = document.createElement('div');
		for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
		document.body.appendChild(node);
		return node;
	};

	it('throws in development when there is no title, Title part or aria-label', async () => {
		await expect(assertOverlayName(el(), 'Dialog')).rejects.toThrow('no accessible name');
	});

	it('accepts aria-label and aria-labelledby (what a Title part sets)', async () => {
		await expect(assertOverlayName(el({ 'aria-label': 'x' }), 'Sheet')).resolves.toBeUndefined();
		await expect(
			assertOverlayName(el({ 'aria-labelledby': 'id' }), 'Sheet')
		).resolves.toBeUndefined();
	});

	it('a mounted Dialog with a `title` prop has the name through its Title part', async () => {
		await open();
		const panel = slot('dialog-content')!;
		const named = document.getElementById(panel.getAttribute('aria-labelledby') ?? '');
		expect(named?.textContent).toBe('Second');
	});
});
