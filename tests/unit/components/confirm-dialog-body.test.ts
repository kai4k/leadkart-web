import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Host from '../stubs/ConfirmBodyHost.svelte';

/**
 * The alert dialog's scroll body: it must not clip the focus ring of a full-width field, and when its content is text
 * only and overflows it is itself a keyboard stop with a name (axe `scrollable-region-focusable`).
 */
let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let overflow = true;

beforeEach(() => {
	overflow = true;
	// jsdom has no layout: a body 200px tall in a 100px box overflows, or does not.
	vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() =>
		overflow ? 200 : 50
	);
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => 100);
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

async function render(withField = false) {
	component = mount(Host, { target, props: { withField } });
	flushSync();
	await new Promise((r) => setTimeout(r, 30));
	flushSync();
	return document.querySelector<HTMLElement>(
		'[data-slot="alert-dialog-content"] .overflow-y-auto'
	)!;
}

describe('ConfirmDialog body', () => {
	it('leaves room for the focus ring of a full-width field (padding with the matching negative margin)', async () => {
		const body = await render(true);
		expect(body.className).toMatch(/\bp-1\b/);
		expect(body.className).toMatch(/-m-1\b/);
	});

	it('text only and overflowing: the region is focusable and named after the dialog', async () => {
		const body = await render(false);
		expect(body.getAttribute('tabindex')).toBe('0');
		expect(body.getAttribute('role')).toBe('region');
		expect(body.getAttribute('aria-label')).toBe('Suspend this person');
	});

	it('text only and not overflowing: no extra tab stop', async () => {
		overflow = false;
		const body = await render(false);
		expect(body.hasAttribute('tabindex')).toBe(false);
		expect(body.hasAttribute('role')).toBe(false);
	});

	it('a field inside is already a focus stop: the region itself is not', async () => {
		const body = await render(true);
		expect(body.hasAttribute('tabindex')).toBe(false);
	});
});
