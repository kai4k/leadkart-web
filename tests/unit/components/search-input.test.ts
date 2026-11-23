import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import SearchInput from '#lib/components/data/SearchInput.svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	const reactive = reactiveProps({ value: '', label: 'Search people', ...props });
	component = mount(SearchInput as never, { target, props: reactive });
	flushSync();
	return reactive;
}
const input = () => target.querySelector<HTMLInputElement>('input[type="search"]')!;
function type(text: string) {
	input().value = text;
	input().dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}
function press(key: string) {
	input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	flushSync();
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

describe('SearchInput', () => {
	it('is a search input named by its label', () => {
		render({ placeholder: 'Email or name' });
		expect(input().getAttribute('aria-label')).toBe('Search people');
		expect(input().getAttribute('placeholder')).toBe('Email or name');
	});

	it('fires once with the trimmed text after the pause', () => {
		const onSearch = vi.fn();
		render({ onSearch });
		type(' ac ');
		expect(onSearch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(299);
		expect(onSearch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onSearch).toHaveBeenCalledTimes(1);
		expect(onSearch).toHaveBeenCalledWith('ac');
	});

	it('typing again restarts the pause: one call for a burst', () => {
		const onSearch = vi.fn();
		render({ onSearch });
		type('a');
		vi.advanceTimersByTime(200);
		type('ac');
		vi.advanceTimersByTime(200);
		expect(onSearch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(onSearch).toHaveBeenCalledTimes(1);
		expect(onSearch).toHaveBeenCalledWith('ac');
	});

	it('Enter fires immediately and cancels the pending pause', () => {
		const onSearch = vi.fn();
		render({ onSearch });
		type('acme');
		press('Enter');
		expect(onSearch).toHaveBeenCalledTimes(1);
		expect(onSearch).toHaveBeenCalledWith('acme');
		vi.advanceTimersByTime(1000);
		expect(onSearch).toHaveBeenCalledTimes(1);
	});

	it('Escape clears the field and fires an empty search', () => {
		const onSearch = vi.fn();
		render({ onSearch });
		type('acme');
		press('Escape');
		expect(input().value).toBe('');
		expect(onSearch).toHaveBeenLastCalledWith('');
		vi.advanceTimersByTime(1000);
		expect(onSearch).toHaveBeenCalledTimes(1);
	});

	it('does not fire for text that is the search already shown', () => {
		const onSearch = vi.fn();
		render({ onSearch, value: 'acme' });
		type('acme ');
		vi.advanceTimersByTime(300);
		expect(onSearch).not.toHaveBeenCalled();
	});

	it('follows the value it is given, for a search the page changed', () => {
		const props = render({ value: 'acme' });
		expect(input().value).toBe('acme');
		props.value = 'zen';
		flushSync();
		expect(input().value).toBe('zen');
	});

	it('honours debounceMs', () => {
		const onSearch = vi.fn();
		render({ onSearch, debounceMs: 50 });
		type('x');
		vi.advanceTimersByTime(50);
		expect(onSearch).toHaveBeenCalledWith('x');
	});

	it('a pending search is dropped when the field goes away', () => {
		const onSearch = vi.fn();
		render({ onSearch });
		type('x');
		unmount(component!);
		component = undefined;
		vi.advanceTimersByTime(1000);
		expect(onSearch).not.toHaveBeenCalled();
	});
});

describe('SearchInput: typed text stays as typed', () => {
	it('does not delete a space the person typed when the page echoes the trimmed search back', () => {
		vi.useFakeTimers();
		const props = render({ value: '', onSearch: vi.fn() });
		type('asha ');
		vi.advanceTimersByTime(300);
		// the page now searches for "asha" and hands it back
		props.value = 'asha';
		flushSync();
		expect(input().value).toBe('asha ');
	});

	it('whitespace only is no search: nothing is sent', () => {
		vi.useFakeTimers();
		const onSearch = vi.fn();
		render({ onSearch, value: '' });
		type('   ');
		vi.advanceTimersByTime(300);
		expect(onSearch).not.toHaveBeenCalled();
	});

	it('limits the text to maxlength and says it is a search field for the keyboard', () => {
		render({ maxlength: 100 });
		expect(input().getAttribute('maxlength')).toBe('100');
		expect(input().getAttribute('enterkeyhint')).toBe('search');
	});
});
