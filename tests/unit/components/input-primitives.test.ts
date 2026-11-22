import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import NumberHost from '../stubs/NumberHost.svelte';
import TagFormHost from '../stubs/TagFormHost.svelte';
import SelectHost from '../stubs/SelectHost.svelte';
import TextField from '#lib/components/form/TextField.svelte';
import PasswordField from '#lib/components/form/PasswordField.svelte';
import FileDropZone from '#lib/components/form/FileDropZone.svelte';
import { TEXT_FORMATS } from '#lib/utils/indian-formats.ts';

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

const type = (el: HTMLInputElement, text: string, inputType = 'insertText') => {
	el.value = text;
	el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data: text }));
	flushSync();
};
const blurWith = (el: HTMLInputElement, text: string) => {
	el.focus();
	type(el, text);
	el.blur();
	flushSync();
};
const bound = () => target.querySelector('[data-testid="bound"]')!.textContent;
const tags = () => target.querySelector('[data-testid="tags"]')!.textContent;

describe('NumberInput never rewrites what was typed', () => {
	const numberInput = () => target.querySelector<HTMLInputElement>('input')!;
	const errorText = () => target.querySelector('[data-slot="field-error"]')?.textContent?.trim();

	it('1.5 in a whole-number field stays 1.5 and says whole number (it used to become 2)', () => {
		render(NumberHost, { label: 'Boxes', initial: 4, locale: 'en-IN' });
		blurWith(numberInput(), '1.5');
		expect(numberInput().value).toBe('1.5');
		expect(numberInput().getAttribute('aria-invalid')).toBe('true');
		expect(numberInput().getAttribute('data-unreadable')).toBe('true');
		expect(numberInput().validity.customError).toBe(true);
		expect(errorText()).toBe('Enter a whole number.');
		expect(bound()).toBe('4');
	});

	it('200 over a max of 100 stays 200 and names the maximum (it used to become 100)', () => {
		render(NumberHost, { label: 'Percent', initial: 10, max: 100, min: 0 });
		blurWith(numberInput(), '200');
		expect(numberInput().value).toBe('200');
		expect(errorText()).toBe('Enter 100 or less.');
		expect(numberInput().getAttribute('data-unreadable')).toBe('true');
	});

	it('-5 under a min of 0 stays -5 and names the minimum (it used to become 0)', () => {
		render(NumberHost, { label: 'Percent', initial: 10, max: 100, min: 0 });
		blurWith(numberInput(), '-5');
		expect(numberInput().value).toBe('-5');
		expect(errorText()).toBe('Enter 0 or more.');
	});

	it('an unsafe integer stays as typed and is refused (it used to become ...992)', () => {
		render(NumberHost, { label: 'Quantity', initial: 1 });
		blurWith(numberInput(), '9007199254740993');
		expect(numberInput().value).toBe('9007199254740993');
		expect(errorText()).toBe('This number is too large to be exact.');
	});

	it('more decimals than the precision are refused, not rounded', () => {
		render(NumberHost, { label: 'Rate', initial: 1, precision: 2 });
		blurWith(numberInput(), '1.234');
		expect(numberInput().value).toBe('1.234');
		expect(errorText()).toBe('Use at most 2 decimal places.');
		blurWith(numberInput(), '1.23');
		expect(numberInput().value).toBe('1.23');
		expect(bound()).toBe('1.23');
		expect(numberInput().getAttribute('aria-invalid')).toBeNull();
	});

	it('a value on the boundary is accepted as typed', () => {
		render(NumberHost, { label: 'Percent', initial: 10, max: 100, min: 0 });
		blurWith(numberInput(), '100');
		expect(bound()).toBe('100');
		blurWith(numberInput(), '0');
		expect(bound()).toBe('0');
		expect(numberInput().getAttribute('aria-invalid')).toBeNull();
	});

	it('Enter on a refused number does not submit the form', () => {
		render(NumberHost, { label: 'Percent', initial: 10, max: 100 });
		numberInput().value = '200';
		numberInput().dispatchEvent(new Event('input', { bubbles: true }));
		const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
		numberInput().dispatchEvent(enter);
		expect(enter.defaultPrevented).toBe(true);
	});

	it('the steppers still clamp: a step never leaves the range', () => {
		render(NumberHost, { label: 'Percent', initial: 98, max: 100, min: 0, step: 5 });
		target.querySelector<HTMLButtonElement>('button[aria-label="Increment"]')!.click();
		flushSync();
		expect(numberInput().value).toBe('100');
		expect(bound()).toBe('100');
		numberInput().dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true })
		);
		flushSync();
		numberInput().dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true })
		);
		flushSync();
		expect(bound()).toBe('0');
	});

	it('a step clears an error and writes a valid number', () => {
		render(NumberHost, { label: 'Percent', initial: 10, max: 100, min: 0 });
		blurWith(numberInput(), '200');
		target.querySelector<HTMLButtonElement>('button[aria-label="Decrement"]')!.click();
		flushSync();
		expect(numberInput().getAttribute('aria-invalid')).toBeNull();
		expect(numberInput().value).toBe('9');
	});

	it('required draws a mark and sets aria-required', () => {
		render(NumberHost, { label: 'Minimum length', initial: 8, required: true });
		expect(target.querySelector('[data-slot="field-required"]')).not.toBeNull();
		expect(numberInput().getAttribute('aria-required')).toBe('true');
	});
});

describe('TagInput never loses what was typed', () => {
	const tagInput = () => target.querySelector<HTMLInputElement>('input')!;

	it('text still in the field becomes a tag when the field is left', () => {
		render(TagFormHost, { label: 'Granted' });
		tagInput().focus();
		type(tagInput(), 'crm.leads.read');
		tagInput().blur();
		flushSync();
		expect(tags()).toBe('crm.leads.read');
		expect(tagInput().value).toBe('');
	});

	it('text still in the field becomes a tag before the form submits (a button elsewhere, Ctrl+Enter)', () => {
		const sent: string[][] = [];
		render(TagFormHost, { label: 'Granted', onsubmitted: (t: string[]) => sent.push(t) });
		tagInput().focus();
		type(tagInput(), 'users.read');
		target.querySelector('form')!.requestSubmit();
		flushSync();
		expect(sent).toEqual([['users.read']]);
	});

	it('a pasted list becomes several tags, separated by commas and line breaks', () => {
		render(TagFormHost, { label: 'Dosage forms' });
		type(tagInput(), 'Tablet, Syrup,\nCapsule', 'insertFromPaste');
		expect(tags()).toBe('Tablet,Syrup,Capsule');
		expect(tagInput().value).toBe('');
	});

	it('a comma that arrives only as an input event (Android: key Unidentified) commits the tag', () => {
		render(TagFormHost, { label: 'Tags' });
		const press = new KeyboardEvent('keydown', {
			key: 'Unidentified',
			bubbles: true,
			cancelable: true
		});
		tagInput().dispatchEvent(press);
		type(tagInput(), 'urgent,');
		expect(tags()).toBe('urgent');
		expect(tagInput().value).toBe('');
		type(tagInput(), 'vip');
		expect(tagInput().value).toBe('vip');
	});

	it('a separator in the middle of typing keeps the text after it', () => {
		render(TagFormHost, { label: 'Tags' });
		type(tagInput(), 'one,tw');
		expect(tags()).toBe('one');
		expect(tagInput().value).toBe('tw');
	});

	it('Tablet, tablet and TABLET are one tag', () => {
		render(TagFormHost, { label: 'Tags' });
		type(tagInput(), 'Tablet, tablet, TABLET', 'insertFromPaste');
		expect(tags()).toBe('Tablet');
		type(tagInput(), 'tABLET', 'insertFromPaste');
		expect(tags()).toBe('Tablet');
	});

	it('text that cannot become a tag stays in the field, says why and blocks the submit', () => {
		render(TagFormHost, { label: 'Tags', maxTags: 1, initial: ['a'] });
		tagInput().focus();
		type(tagInput(), 'b');
		tagInput().blur();
		flushSync();
		expect(tags()).toBe('a');
		expect(tagInput().value).toBe('b');
		expect(tagInput().getAttribute('aria-invalid')).toBe('true');
		expect(tagInput().getAttribute('data-unreadable')).toBe('true');
	});

	it('required draws a mark and sets aria-required', () => {
		render(TagFormHost, { label: 'Granted', required: true });
		expect(target.querySelector('[data-slot="field-required"]')).not.toBeNull();
		expect(tagInput().getAttribute('aria-required')).toBe('true');
	});
});

describe('Select keeps a stored value the list does not offer', () => {
	const options = [
		{ value: 'en-IN', label: 'English (India)' },
		{ value: 'hi-IN', label: 'Hindi' }
	];

	it('shows it as an extra option, selected, and posts it unchanged', () => {
		render(SelectHost, { options, label: 'Locale', initial: 'ta-IN' });
		const select = target.querySelector('select')!;
		expect(select.selectedIndex).toBeGreaterThanOrEqual(0);
		expect(select.value).toBe('ta-IN');
		expect(select.selectedOptions[0]?.textContent).toBe('ta-IN');
		expect(bound()).toBe('ta-IN');
		const data = new FormData();
		data.append(select.name || 'x', select.value);
		expect([...data.values()]).toEqual(['ta-IN']);
	});

	it('a listed value adds no extra option, and an empty one adds none either', () => {
		render(SelectHost, { options, label: 'Locale', initial: 'hi-IN' });
		expect(target.querySelectorAll('option')).toHaveLength(2);
		unmount(component!);
		target.remove();
		render(SelectHost, { options, label: 'Locale', initial: '' });
		expect(target.querySelectorAll('option')).toHaveLength(2);
	});

	it('required draws a mark and sets aria-required', () => {
		render(SelectHost, { options, label: 'Locale', required: true });
		expect(target.querySelector('[data-slot="field-required"]')).not.toBeNull();
		expect(target.querySelector('select')!.getAttribute('aria-required')).toBe('true');
	});
});

describe('PasswordField', () => {
	it('keeps the keyboard out of it in both states (shown as text it was open to spellcheck)', () => {
		render(PasswordField, { label: 'Password', name: 'password' });
		const input = target.querySelector<HTMLInputElement>('input')!;
		const check = () => {
			expect(input.getAttribute('autocapitalize')).toBe('none');
			expect(input.getAttribute('autocorrect')).toBe('off');
			expect(input.getAttribute('spellcheck')).toBe('false');
		};
		check();
		target.querySelector<HTMLButtonElement>('button')!.click();
		flushSync();
		expect(input.type).toBe('text');
		check();
	});
});

describe('TextField format', () => {
	const input = () => target.querySelector<HTMLInputElement>('input')!;

	it.each([
		['email', { type: 'email', inputmode: 'email', autocapitalize: 'none', autocomplete: 'email' }],
		['phone', { type: 'tel', inputmode: 'tel', autocapitalize: 'none', autocomplete: 'tel' }],
		['pincode', { type: 'text', inputmode: 'numeric', autocomplete: 'postal-code' }],
		['gstin', { type: 'text', autocapitalize: 'characters', autocomplete: 'off' }],
		['pan', { type: 'text', autocapitalize: 'characters', autocomplete: 'off' }],
		['code', { type: 'text', autocapitalize: 'none', autocomplete: 'off' }]
	] as const)('%s sets its keyboard attributes from the table', (format, attrs) => {
		render(TextField, { label: 'Field', format });
		for (const [name, expected] of Object.entries(attrs)) {
			expect(input().getAttribute(name === 'type' ? 'type' : name)).toBe(expected);
		}
		expect(input().getAttribute('spellcheck')).toBe('false');
		expect(input().getAttribute('autocorrect')).toBe('off');
	});

	it('the table has exactly the six formats', () => {
		expect(Object.keys(TEXT_FORMATS).sort()).toEqual([
			'code',
			'email',
			'gstin',
			'pan',
			'phone',
			'pincode'
		]);
	});

	it("a caller's own autocomplete wins over the table (sign-in says username)", () => {
		render(TextField, { label: 'Email', format: 'email', autocomplete: 'username' });
		expect(input().getAttribute('autocomplete')).toBe('username');
		expect(input().type).toBe('email');
	});

	it('no format adds none of these attributes', () => {
		render(TextField, { label: 'Name' });
		expect(input().hasAttribute('inputmode')).toBe(false);
		expect(input().hasAttribute('autocapitalize')).toBe(false);
	});

	it('a GSTIN is tidied when the field is left, and the tidied text is what the input holds', () => {
		render(TextField, { label: 'GSTIN', format: 'gstin' });
		blurWith(input(), ' 27aapfu0939f1zv ');
		expect(input().value).toBe('27AAPFU0939F1ZV');
	});

	it('a pasted GSTIN is tidied at once; typing is left alone until the field is left', () => {
		render(TextField, { label: 'GSTIN', format: 'gstin' });
		type(input(), '27aapfu0939f1zv ', 'insertFromPaste');
		expect(input().value).toBe('27AAPFU0939F1ZV');
		unmount(component!);
		target.remove();
		render(TextField, { label: 'GSTIN', format: 'gstin' });
		type(input(), '27aap');
		expect(input().value).toBe('27aap');
	});

	it('a phone, a pincode and an email are tidied on blur', () => {
		render(TextField, { label: 'Phone', format: 'phone' });
		blurWith(input(), '98765 43210');
		expect(input().value).toBe('+919876543210');
		unmount(component!);
		target.remove();
		render(TextField, { label: 'Pincode', format: 'pincode' });
		blurWith(input(), '560 001');
		expect(input().value).toBe('560001');
		unmount(component!);
		target.remove();
		render(TextField, { label: 'Email', format: 'email' });
		blurWith(input(), '  asha@example.in ');
		expect(input().value).toBe('asha@example.in');
	});

	it("the caller's onblur runs after the tidy, so it reads the tidied text", () => {
		const seen: string[] = [];
		render(TextField, {
			label: 'PAN',
			format: 'pan',
			onblur: (e: FocusEvent) => seen.push((e.currentTarget as HTMLInputElement).value)
		});
		blurWith(input(), 'abcpe1234f');
		expect(seen).toEqual(['ABCPE1234F']);
	});

	it('a field that is not a format is never tidied', () => {
		render(TextField, { label: 'Name' });
		blurWith(input(), '  Asha  ');
		expect(input().value).toBe('  Asha  ');
	});
});

describe('TextField maxlength never cuts a paste', () => {
	const input = () => target.querySelector<HTMLInputElement>('input')!;
	const slug = 'a'.repeat(62);

	it('a paste past the limit is kept whole and the field says it is too long', () => {
		render(TextField, { label: 'Slug', maxlength: 60 });
		type(input(), slug, 'insertFromPaste');
		expect(input().value).toBe(slug);
		expect(input().getAttribute('aria-invalid')).toBe('true');
		expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe(
			'Use at most 60 characters.'
		);
		expect(input().hasAttribute('maxlength')).toBe(false);
	});

	it('text at the limit has no error, and fixing the text clears it', () => {
		render(TextField, { label: 'Slug', maxlength: 60 });
		type(input(), 'a'.repeat(60));
		expect(input().getAttribute('aria-invalid')).toBeNull();
		type(input(), 'a'.repeat(61));
		expect(input().getAttribute('aria-invalid')).toBe('true');
		type(input(), 'a'.repeat(60));
		expect(input().getAttribute('aria-invalid')).toBeNull();
	});

	it("the form's own error is shown instead of this one", () => {
		render(TextField, { label: 'Slug', maxlength: 3, error: 'Taken' });
		type(input(), 'abcdef');
		expect(target.querySelector('[data-slot="field-error"]')?.textContent?.trim()).toBe('Taken');
	});
});

describe('required on every field primitive', () => {
	it('TextField: mark and aria-required; not required: neither', () => {
		render(TextField, { label: 'Email', required: true });
		expect(target.querySelector('[data-slot="field-required"]')).not.toBeNull();
		expect(target.querySelector('input')!.getAttribute('aria-required')).toBe('true');
		unmount(component!);
		target.remove();
		render(TextField, { label: 'Email' });
		expect(target.querySelector('[data-slot="field-required"]')).toBeNull();
		expect(target.querySelector('input')!.hasAttribute('aria-required')).toBe(false);
	});

	it('the mark is decorative: the label name a screen reader gets is unchanged', () => {
		render(TextField, { label: 'Email', required: true });
		const mark = target.querySelector('[data-slot="field-required"]')!;
		expect(mark.getAttribute('aria-hidden')).toBe('true');
	});

	it('FileDropZone: mark and aria-required on the file input', () => {
		render(FileDropZone, { label: 'Upload', value: null, required: true });
		expect(target.querySelector('[data-slot="field-required"]')).not.toBeNull();
		expect(target.querySelector('input[type="file"]')!.getAttribute('aria-required')).toBe('true');
	});
});
