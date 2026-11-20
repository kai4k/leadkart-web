import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import en from '../../../src/lib/i18n/locales/en.json';
import TextareaField from '#lib/components/form/TextareaField.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(TextareaField, { target, props: props as never });
	flushSync();
	return target.querySelector('textarea')!;
}

const type = (el: HTMLTextAreaElement, text: string) => {
	el.value = text;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const described = (el: Element) =>
	(el.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);

describe('TextareaField', () => {
	it('shows a counter once maxlength is set, in words, and the textarea is described by it', () => {
		const ta = render({ label: 'Reason', name: 'reason', value: '', maxlength: 10 });
		type(ta, 'abc');
		const counter = target.querySelector(`#${ta.id}-counter`)!;
		expect(counter.textContent).toContain('3/10');
		expect(counter.textContent).toContain(
			en.form.counter.words.replace('{n}', '3').replace('{max}', '10')
		);
		expect(described(ta)).toContain(counter.id);
	});

	it('the counter is not a live region: typing announces nothing until 90% of the limit', () => {
		const ta = render({ label: 'Reason', name: 'reason', value: '', maxlength: 10 });
		expect(target.querySelector('[aria-live]')).toBeNull();
		const status = () => target.querySelector('[role="status"]')!.textContent?.trim();
		for (const text of ['a', 'ab', 'abc', 'abcd', 'abcde', 'abcdef', 'abcdefg', 'abcdefgh']) {
			type(ta, text);
			expect(status()).toBe('');
		}
	});

	it('announces once at 90% and once at the limit, and clears below', () => {
		const ta = render({ label: 'Reason', name: 'reason', value: '', maxlength: 10 });
		const status = () => target.querySelector('[role="status"]')!.textContent?.trim();
		type(ta, 'abcdefghi');
		expect(status()).toBe('1 character left');
		// still in the same zone: the text does not change per keystroke
		type(ta, 'abcdefghi');
		expect(status()).toBe('1 character left');
		type(ta, 'abcdefghij');
		expect(status()).toBe(en.form.counter.limit);
		type(ta, 'abc');
		expect(status()).toBe('');
	});

	it('has no counter without maxlength', () => {
		render({ label: 'Reason', name: 'reason', value: '' });
		expect(target.querySelector('[aria-live="polite"]')).toBeNull();
	});

	it('error sets aria-invalid, is not an alert, and is described before the hint', () => {
		const ta = render({
			label: 'Reason',
			name: 'reason',
			value: '',
			hint: 'Why?',
			error: 'Required'
		});
		expect(ta.getAttribute('aria-invalid')).toBe('true');
		const alert = target.querySelector('[data-slot="field-error"]')!;
		expect(alert.textContent?.trim()).toBe('Required');
		// not a live region of its own, and read before the hint
		expect(alert.getAttribute('role')).toBeNull();
		expect(described(ta)[0]).toBe(alert.id);
		expect(described(ta)).toHaveLength(2);
	});

	it('is labelled by its visible label and forwards name, rows, required, placeholder', () => {
		const ta = render({
			label: 'Reason',
			name: 'reason',
			value: '',
			rows: 5,
			required: true,
			placeholder: 'Say why'
		});
		expect(ta.labels?.[0]?.textContent?.trim()).toBe('Reason');
		expect(ta.name).toBe('reason');
		expect(ta.rows).toBe(5);
		expect(ta.required).toBe(true);
		expect(ta.placeholder).toBe('Say why');
	});

	it('defaults to 3 rows and passes a caller id through', () => {
		const ta = render({ label: 'Reason', name: 'reason', value: '', id: 'my-reason' });
		expect(ta.rows).toBe(3);
		expect(ta.id).toBe('my-reason');
	});
});
