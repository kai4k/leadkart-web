import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import SelectHost from '../stubs/SelectHost.svelte';

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
	{ value: 'b', label: 'Beta' }
];

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(SelectHost, { target, props: { options, label: 'Letter', ...props } });
	flushSync();
	return target.querySelector('select')!;
}

describe('Select (native)', () => {
	it('updates the bound value on change', () => {
		const sel = render({});
		sel.value = 'b';
		sel.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		expect(target.querySelector('[data-testid="bound"]')!.textContent).toBe('b');
	});

	it('is a native select labelled by its visible label', () => {
		const sel = render({});
		expect(sel.tagName).toBe('SELECT');
		expect(sel.labels?.[0]?.textContent?.trim()).toBe('Letter');
	});

	it('error sets aria-invalid, an alert, and describedby with the hint', () => {
		const sel = render({ error: 'Pick one', hint: 'Any letter' });
		expect(sel.getAttribute('aria-invalid')).toBe('true');
		const alert = target.querySelector('[role="alert"]')!;
		expect(alert.textContent?.trim()).toBe('Pick one');
		const described = (sel.getAttribute('aria-describedby') ?? '').split(' ');
		expect(described).toContain(alert.id);
		expect(described).toHaveLength(2);
	});

	it('shows a disabled placeholder option while empty', () => {
		const sel = render({ placeholder: 'Choose' });
		const first = sel.options[0]!;
		expect(first.textContent?.trim()).toBe('Choose');
		expect(first.disabled).toBe(true);
		expect(sel.value).toBe('');
	});

	it('gives two selects with the same label different ids', () => {
		const first = render({});
		const second = document.body.appendChild(document.createElement('div'));
		const other = mount(SelectHost, { target: second, props: { options, label: 'Letter' } });
		flushSync();
		expect(first.id).not.toBe(second.querySelector('select')!.id);
		unmount(other);
	});
});
