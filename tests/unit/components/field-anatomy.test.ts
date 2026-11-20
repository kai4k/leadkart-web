import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import TextField from '#lib/components/form/TextField.svelte';
import PasswordField from '#lib/components/form/PasswordField.svelte';
import NumberInput from '#lib/components/form/NumberInput.svelte';
import Switch from '#lib/components/form/Switch.svelte';
import RadioHost from '../stubs/RadioHost.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

function render(C: unknown, props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(C as Component<Record<string, unknown>>, { target, props });
	flushSync();
}

const ids = (el: Element) => (el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);

describe('TextField anatomy', () => {
	it('describes the input by the hint and the error, both reachable by id', () => {
		render(TextField, { label: 'Email', hint: 'We never share it', error: 'Enter a valid email' });
		const input = target.querySelector('input')!;
		const described = ids(input);
		expect(described).toHaveLength(2);
		const texts = described.map((id) => document.getElementById(id)?.textContent?.trim());
		expect(texts).toContain('We never share it');
		expect(texts).toContain('Enter a valid email');
	});

	it('marks the error role=alert and the input aria-invalid', () => {
		render(TextField, { label: 'Email', error: 'Required' });
		expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe('Required');
		expect(target.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
	});

	it('has no aria-invalid and no describedby when clean', () => {
		render(TextField, { label: 'Email' });
		const input = target.querySelector('input')!;
		expect(input.hasAttribute('aria-invalid')).toBe(false);
		expect(input.hasAttribute('aria-describedby')).toBe(false);
	});

	it('is labelled by the visible label, and by sr-only text with srLabel', () => {
		render(TextField, { label: 'Email' });
		expect(target.querySelector('input')!.labels?.[0]?.textContent?.trim()).toBe('Email');
		unmount(component!);
		component = undefined;
		target.remove();
		render(TextField, { label: 'Search', srLabel: true });
		const sr = target.querySelector('input')!;
		expect(sr.labels?.[0]?.textContent?.trim()).toBe('Search');
		expect(sr.labels?.[0]?.className).toContain('sr-only');
	});

	it('gives two fields with the same label different ids', () => {
		render(TextField, { label: 'Name' });
		const first = target.querySelector('input')!.id;
		const second = document.body.appendChild(document.createElement('div'));
		const other = mount(TextField, { target: second, props: { label: 'Name' } });
		flushSync();
		const secondId = second.querySelector('input')!.id;
		expect(first).not.toBe('');
		expect(secondId).not.toBe('');
		expect(first).not.toBe(secondId);
		unmount(other);
	});

	it('uses the id the caller passes for the control and its error', () => {
		render(TextField, { label: 'Name', id: 'custom-id', error: 'x' });
		expect(target.querySelector('input')!.id).toBe('custom-id');
		expect(ids(target.querySelector('input')!)).toEqual(['custom-id-error']);
	});

	it('keeps name and other native attributes on the input', () => {
		render(TextField, {
			label: 'Name',
			name: 'display_name',
			autocomplete: 'name',
			required: true
		});
		const input = target.querySelector<HTMLInputElement>('input[name="display_name"]')!;
		expect(input.getAttribute('autocomplete')).toBe('name');
		expect(input.required).toBe(true);
	});
});

describe('PasswordField', () => {
	it('toggles visibility with a labelled pressed-state button and stays described', () => {
		render(PasswordField, { label: 'Password', error: 'Too short' });
		const input = target.querySelector('input')!;
		expect(input.type).toBe('password');
		const toggle = target.querySelector('button')!;
		expect(toggle.getAttribute('aria-label')).toBe('Show password');
		toggle.click();
		flushSync();
		expect(input.type).toBe('text');
		expect(toggle.getAttribute('aria-pressed')).toBe('true');
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(ids(input)).toHaveLength(1);
	});
});

describe('NumberInput', () => {
	it('is a labelled spinbutton described by hint and error, invalid on error', () => {
		render(NumberInput, { label: 'Quantity', value: 3, hint: 'Units', error: 'Too many' });
		const input = target.querySelector<HTMLInputElement>('input[role="spinbutton"]')!;
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(ids(input)).toHaveLength(2);
		expect(input.labels?.[0]?.textContent?.trim()).toBe('Quantity');
		expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe('Too many');
	});

	it('steps with ArrowUp and the plus button', () => {
		render(NumberInput, { label: 'Quantity', value: 1, step: 2 });
		const input = target.querySelector<HTMLInputElement>('input')!;
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
		flushSync();
		expect(input.value).toBe('3');
		target.querySelector<HTMLButtonElement>('button[aria-label="Increment"]')!.click();
		flushSync();
		expect(input.value).toBe('5');
	});
});

describe('NumberInput parsing', () => {
	function blurWith(text: string, props: Record<string, unknown> = {}) {
		render(NumberInput, { label: 'Amount', value: 5, locale: 'en-IN', ...props });
		const input = target.querySelector<HTMLInputElement>('input')!;
		input.focus();
		input.value = text;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.blur();
		flushSync();
		return input;
	}

	it('reads 1,00,000 as 100000 in en-IN', () => {
		const input = blurWith('1,00,000');
		expect(input.value).toBe('100000');
		expect(input.getAttribute('aria-invalid')).toBeNull();
	});

	it('reads a decimal and keeps min / max clamping', () => {
		expect(blurWith('1.5', { precision: 1 }).value).toBe('1.5');
		expect(blurWith('1,00,000', { max: 500 }).value).toBe('500');
	});

	it('garbage keeps the previous value, restores it and marks the field invalid', () => {
		const input = blurWith('abc');
		expect(input.value).toBe('5');
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(target.querySelector('[id$="-error"]')?.textContent).toContain('valid number');
		// Typing again clears the complaint.
		input.value = '7';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		expect(input.getAttribute('aria-invalid')).toBeNull();
	});
});

describe('NumberInput commits on submit and reads strictly (fix round B)', () => {
	function typeInto(text: string, props: Record<string, unknown> = {}) {
		render(NumberInput, { label: 'Amount', value: 5, locale: 'en-IN', ...props });
		const input = target.querySelector<HTMLInputElement>('input')!;
		input.focus();
		input.value = text;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		return input;
	}
	const press = (input: HTMLInputElement, key: string) => {
		const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		input.dispatchEvent(e);
		return e;
	};

	it('Enter commits the shown text to the model and to the DOM value a native submit reads', () => {
		const input = typeInto('1,00,000');
		const e = press(input, 'Enter');
		// no flushSync: a native form submit reads the field right after keydown
		expect(input.value).toBe('100000');
		flushSync();
		expect(input.getAttribute('aria-valuenow')).toBe('100000');
		expect(e.defaultPrevented).toBe(false);
	});
	it('Enter on unreadable text does not submit, restores the value and marks the field invalid', () => {
		const input = typeInto('1,5');
		const e = press(input, 'Enter');
		flushSync();
		expect(e.defaultPrevented).toBe(true);
		expect(input.value).toBe('5');
		expect(input.getAttribute('aria-invalid')).toBe('true');
	});
	it('a group separator in the wrong place is refused, not read as another number', () => {
		for (const bad of ['1,5', '1,,2', '1,']) {
			const input = typeInto(bad);
			input.blur();
			flushSync();
			expect(input.getAttribute('aria-invalid')).toBe('true');
			expect(input.value).toBe('5');
			unmount(component!);
			target.remove();
		}
	});
	it('a decimal-comma locale re-reads its own output after a nudge', () => {
		const input = typeInto('1.234,5', { locale: 'de', precision: 1 });
		input.blur();
		flushSync();
		expect(input.value).toBe('1234,5');
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
		flushSync();
		expect(input.value).toBe('1235,5');
		expect(input.getAttribute('aria-invalid')).toBeNull();
	});
	it('reads Devanagari digits in hi', () => {
		const input = typeInto('१,२३,४५६', { locale: 'hi' });
		input.blur();
		flushSync();
		expect(input.value).toBe('123456');
	});
});

describe('Switch', () => {
	it('is a labelled switch described by its hint, toggled by click', () => {
		render(Switch, { label: 'Email alerts', hint: 'Daily digest' });
		const sw = target.querySelector<HTMLButtonElement>('[role="switch"]')!;
		expect(sw.getAttribute('aria-checked')).toBe('false');
		expect(sw.labels?.[0]?.textContent?.trim()).toBe('Email alerts');
		expect(document.getElementById(ids(sw)[0]!)?.textContent?.trim()).toBe('Daily digest');
		sw.click();
		flushSync();
		expect(sw.getAttribute('aria-checked')).toBe('true');
	});
});

describe('RadioGroup', () => {
	it('names the group by its label and describes it by hint and error', () => {
		render(RadioHost, { label: 'Plan', hint: 'Pick one', error: 'Required' });
		const group = target.querySelector('[role="radiogroup"]')!;
		const name = document.getElementById(group.getAttribute('aria-labelledby')!);
		expect(name?.textContent?.trim()).toBe('Plan');
		expect(group.getAttribute('aria-invalid')).toBe('true');
		expect(ids(group)).toHaveLength(2);
		expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe('Required');
	});

	it('names each radio by its label and moves selection with the arrow keys', () => {
		render(RadioHost, { label: 'Plan' });
		const radios = [...target.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
		expect(radios.map((r) => r.labels?.[0]?.textContent?.trim())).toEqual(['Starter', 'Pro']);
		radios[0]!.focus();
		radios[0]!.click();
		flushSync();
		expect(radios[0]!.getAttribute('aria-checked')).toBe('true');
		radios[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();
		expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
	});

	it('two groups with the same label do not share an id', () => {
		render(RadioHost, { label: 'Plan' });
		const second = document.body.appendChild(document.createElement('div'));
		const other = mount(RadioHost, { target: second, props: { label: 'Plan' } });
		flushSync();
		const a = target.querySelector('[role="radiogroup"]')!.getAttribute('aria-labelledby');
		const b = second.querySelector('[role="radiogroup"]')!.getAttribute('aria-labelledby');
		expect(a).not.toBe(b);
		unmount(other);
	});
});
