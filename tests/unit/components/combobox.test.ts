import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import Combobox from '#lib/components/form/Combobox.svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import en from '../../../src/lib/i18n/locales/en.json';

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
	document.querySelector<HTMLInputElement>(
		`input[role="combobox"][aria-label="${en.form.combobox.filter}"]`
	);
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
	await tick();
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
		// Command highlights the first match after the filter pass; Enter selects the highlight.
		await vi.waitFor(() =>
			expect(document.querySelector('[role="option"][data-selected]')).not.toBeNull()
		);
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
		// Wait for any async filter pass to settle before asserting nothing was filtered out.
		await new Promise((r) => setTimeout(r, 50));
		expect(optionTexts()).toHaveLength(3);
	});

	it('error sets aria-invalid, an alert, and describedby with the hint', () => {
		const trigger = render({ error: 'Pick one', hint: 'Any letter' });
		expect(trigger.getAttribute('aria-invalid')).toBe('true');
		const message = target.querySelector('[data-slot="field-error"]')!;
		expect(message.textContent?.trim()).toBe('Pick one');
		const described = (trigger.getAttribute('aria-describedby') ?? '').split(' ');
		expect(described).toHaveLength(2);
		// The error is read before the hint.
		expect(described[0]).toBe(message.id);
	});

	it('submits the value through a hidden input when it has a name', () => {
		render({ name: 'owner', value: 'a' });
		expect(
			target.querySelector<HTMLInputElement>('input[type="hidden"][name="owner"]')!.value
		).toBe('a');
	});

	describe('a chosen value keeps its label', () => {
		function renderReactive(props: Record<string, unknown>) {
			const reactive = reactiveProps<Record<string, unknown>>({
				label: 'Letter',
				options,
				...props
			});
			target = document.body.appendChild(document.createElement('div'));
			component = mount(Combobox, { target, props: reactive as never });
			flushSync();
			return {
				reactive,
				trigger: target.querySelector<HTMLButtonElement>('button[role="combobox"]')!
			};
		}

		it('server mode: select, the options are replaced, the trigger still names the choice', async () => {
			const onInput = vi.fn();
			const { reactive, trigger } = renderReactive({ onInput, placeholder: 'Pick one' });
			await open(trigger);
			document.querySelector<HTMLElement>('[role="option"]')!.click();
			flushSync();
			await vi.waitFor(() => expect(filterInput()).toBeNull());
			expect(trigger.textContent).toContain('Alpha');
			reactive.options = [];
			flushSync();
			expect(trigger.textContent).toContain('Alpha');
			expect(trigger.textContent).not.toContain('Pick one');
		});

		it('Escape after choosing does not clear the caller query or the label', async () => {
			const onInput = vi.fn();
			const { reactive, trigger } = renderReactive({ onInput });
			const input = await open(trigger);
			await type(input, 'bet');
			document.querySelector<HTMLElement>('[role="option"]')!.click();
			flushSync();
			await vi.waitFor(() => expect(filterInput()).toBeNull());
			reactive.options = [];
			flushSync();
			await open(trigger);
			filterInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			flushSync();
			await vi.waitFor(() => expect(filterInput()).toBeNull());
			expect(onInput).not.toHaveBeenCalledWith('');
			expect(trigger.textContent).toContain('Alpha');
		});

		it('a pre-selected value that is not in the options uses selectedLabel', () => {
			const { trigger } = renderReactive({ value: 'zzz', selectedLabel: 'Zeta (server)' });
			expect(trigger.textContent).toContain('Zeta (server)');
		});

		it('clear returns the placeholder and reports the empty value', () => {
			const onValueChange = vi.fn();
			const { trigger } = renderReactive({
				value: 'a',
				clearable: true,
				placeholder: 'Pick one',
				onValueChange
			});
			expect(trigger.textContent).toContain('Alpha');
			target
				.querySelector<HTMLButtonElement>(`button[aria-label="${en.form.combobox.clear}"]`)!
				.click();
			flushSync();
			expect(onValueChange).toHaveBeenCalledWith('');
			expect(trigger.textContent).toContain('Pick one');
		});
	});

	describe('keyboard and state', () => {
		it('ArrowDown on the closed trigger opens the list', async () => {
			const trigger = render();
			trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			flushSync();
			await vi.waitFor(() => expect(filterInput()).not.toBeNull());
		});

		it('a printable character on the closed trigger opens the list with that character as the filter', async () => {
			const onInput = vi.fn();
			const trigger = render({ onInput });
			trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
			flushSync();
			await vi.waitFor(() => expect(filterInput()).not.toBeNull());
			expect(filterInput()!.value).toBe('g');
			expect(onInput).toHaveBeenCalledWith('g');
		});

		it('the chosen option says so in text (aria-selected on an option is the highlight)', async () => {
			await open(render({ value: 'b' }));
			const chosen = [...document.querySelectorAll('[role="option"]')].find((o) =>
				o.textContent?.includes('Beta')
			)!;
			expect(chosen.textContent).toContain(en.form.combobox.selected);
		});

		it('required reports the required error once it was opened and closed with nothing chosen', async () => {
			const trigger = render({ required: true });
			expect(target.querySelector('[id$="-error"]')).toBeNull();
			await open(trigger);
			filterInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
			flushSync();
			await vi.waitFor(() => expect(filterInput()).toBeNull());
			const message = target.querySelector('[id$="-error"]')!;
			expect(message.textContent?.trim()).toBe(en.form.required);
			expect(trigger.getAttribute('aria-invalid')).toBe('true');
			expect(trigger.getAttribute('aria-describedby')).toContain(message.id);
		});
	});
});
