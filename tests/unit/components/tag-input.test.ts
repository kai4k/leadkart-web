import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import TagInputHost from '../stubs/TagInputHost.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

function render(props: Record<string, unknown> = {}) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(TagInputHost, { target, props: { label: 'Tags', ...props } as never });
	flushSync();
	return target.querySelector<HTMLInputElement>('input')!;
}

const key = (el: HTMLElement, k: string) => {
	el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
	flushSync();
};
const typeText = (el: HTMLInputElement, text: string) => {
	el.value = text;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const tags = () => target.querySelector('[data-testid="tags"]')!.textContent;

describe('TagInput', () => {
	it('is labelled by the visible label, not the placeholder', () => {
		const input = render({ placeholder: 'Add a tag' });
		expect(input.labels?.[0]?.textContent?.trim()).toBe('Tags');
	});

	it('Enter adds a tag and clears the field', () => {
		const input = render();
		typeText(input, 'urgent');
		key(input, 'Enter');
		expect(tags()).toBe('urgent');
		expect(input.value).toBe('');
		expect(target.textContent).toContain('urgent');
	});

	it('comma adds a tag too, and a duplicate is ignored', () => {
		const input = render();
		typeText(input, 'a');
		key(input, ',');
		typeText(input, 'a');
		key(input, 'Enter');
		typeText(input, 'b');
		key(input, 'Enter');
		expect(tags()).toBe('a,b');
	});

	it('Backspace on an empty input removes the last tag', () => {
		const input = render({ initial: ['x', 'y'] });
		key(input, 'Backspace');
		expect(tags()).toBe('x');
	});

	it('Backspace with text typed only edits the text', () => {
		const input = render({ initial: ['x'] });
		typeText(input, 'abc');
		key(input, 'Backspace');
		expect(tags()).toBe('x');
	});

	it('each remove button is named after its tag', () => {
		render({ initial: ['x', 'y'] });
		const remove = target.querySelector<HTMLButtonElement>('button[aria-label="Remove x"]')!;
		remove.click();
		flushSync();
		expect(tags()).toBe('y');
	});

	it('a validator error is announced and described', () => {
		const input = render({ validate: true });
		typeText(input, 'bad tag');
		key(input, 'Enter');
		const alert = target.querySelector('[data-slot="field-error"]')!;
		expect(alert.textContent?.trim()).toBe('No spaces');
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(input.getAttribute('aria-describedby')).toContain(alert.id);
		expect(tags()).toBe('');
	});

	it('error and hint both describe the input', () => {
		const input = render({ error: 'Too few', hint: 'Add some' });
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(input.getAttribute('aria-describedby')!.split(' ')).toHaveLength(2);
	});
});
