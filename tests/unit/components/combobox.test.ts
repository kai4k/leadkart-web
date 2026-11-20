import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Combobox from '#lib/components/form/Combobox.svelte';

// jsdom has no scrollIntoView; bits Command scrolls the highlighted item into view.
beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const options = [
	{ value: 'a', label: 'Alpha' },
	{ value: 'b', label: 'Beta' },
	{ value: 'c', label: 'Gamma', description: 'third' }
];

function render(props: Record<string, unknown> = {}) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Combobox, {
		target,
		props: { label: 'Letter', options, ...props } as never
	});
	flushSync();
	return target.querySelector<HTMLButtonElement>('button[role="combobox"]')!;
}

const filterInput = () =>
	document.querySelector<HTMLInputElement>('input[role="combobox"][aria-label="Filter options"]');
const optionTexts = () =>
	[...document.querySelectorAll('[role="option"]')].map((o) => o.textContent?.trim());

async function open(trigger: HTMLButtonElement) {
	trigger.click();
	flushSync();
	await vi.waitFor(() => expect(filterInput()).not.toBeNull());
	return filterInput()!;
}

async function type(input: HTMLInputElement, text: string) {
	input.value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
	await vi.waitFor(() => expect(true).toBe(true));
}

describe('Combobox', () => {
	it('is a labelled combobox that reports expanded state', async () => {
		const trigger = render();
		expect(trigger.labels?.[0]?.textContent?.trim()).toBe('Letter');
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		await open(trigger);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
	});

	it('names the listbox', async () => {
		await open(render());
		expect(document.querySelector('[role="listbox"]')!.getAttribute('aria-label')).toBe('Letter');
	});

	it('typing filters the options', async () => {
		const input = await open(render());
		expect(optionTexts().join('|')).toContain('Alpha');
		await type(input, 'bet');
		await vi.waitFor(() => expect(optionTexts()).toEqual(['Beta']));
	});

	it('Enter selects the highlighted option, calls onValueChange and shows its label', async () => {
		const onValueChange = vi.fn();
		const trigger = render({ onValueChange });
		const input = await open(trigger);
		await type(input, 'bet');
		await vi.waitFor(() => expect(optionTexts()).toEqual(['Beta']));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		await vi.waitFor(() => expect(onValueChange).toHaveBeenCalledWith('b'));
		await vi.waitFor(() => expect(trigger.textContent).toContain('Beta'));
		await vi.waitFor(() => expect(filterInput()).toBeNull());
	});

	it('shows the empty state when nothing matches', async () => {
		const input = await open(render({ emptyState: 'Nothing here' }));
		await type(input, 'zzz');
		await vi.waitFor(() => expect(document.body.textContent).toContain('Nothing here'));
	});

	it('server mode: relays the query and does not filter locally', async () => {
		const onInput = vi.fn();
		const input = await open(render({ onInput }));
		await type(input, 'zzz');
		expect(onInput).toHaveBeenCalledWith('zzz');
		expect(optionTexts()).toHaveLength(3);
	});

	it('error sets aria-invalid, an alert, and describedby with the hint', () => {
		const trigger = render({ error: 'Pick one', hint: 'Any letter' });
		expect(trigger.getAttribute('aria-invalid')).toBe('true');
		const alert = target.querySelector('[role="alert"]')!;
		expect(alert.textContent?.trim()).toBe('Pick one');
		const described = (trigger.getAttribute('aria-describedby') ?? '').split(' ');
		expect(described).toContain(alert.id);
		expect(described).toHaveLength(2);
	});

	it('submits the value through a hidden input when it has a name', () => {
		render({ name: 'owner', value: 'a' });
		expect(
			target.querySelector<HTMLInputElement>('input[type="hidden"][name="owner"]')!.value
		).toBe('a');
	});
});
