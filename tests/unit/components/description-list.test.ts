import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import DescriptionList from '#lib/components/ui/DescriptionList.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(DescriptionList as never, { target, props });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const terms = () => [...target.querySelectorAll('dt')].map((e) => e.textContent?.trim());
const defs = () => [...target.querySelectorAll('dd')].map((e) => e.textContent?.trim());

describe('DescriptionList', () => {
	it('is a semantic dl: one dt/dd pair per item, in order', () => {
		render({
			items: [
				{ label: 'GSTIN', value: '27ABCDE1234F1Z5' },
				{ label: 'Phone', value: '+91 99999 00000' }
			]
		});
		expect(target.querySelectorAll('dl').length).toBe(1);
		expect(terms()).toEqual(['GSTIN', 'Phone']);
		expect(defs()).toEqual(['27ABCDE1234F1Z5', '+91 99999 00000']);
	});

	it.each([[null], [undefined], ['']])('renders an em dash for an empty value (%s)', (value) => {
		render({ items: [{ label: 'PAN', value }] });
		expect(defs()).toEqual(['—']);
	});

	it('keeps a legitimate zero', () => {
		render({ items: [{ label: 'Count', value: 0 }] });
		expect(defs()).toEqual(['0']);
	});

	it('uses the caller fallback', () => {
		render({ items: [{ label: 'PAN' }], fallback: 'Not set' });
		expect(defs()).toEqual(['Not set']);
	});

	it('mono puts the value in the mono font', () => {
		render({ items: [{ label: 'ID', value: 'abc', mono: true }] });
		expect(target.querySelector('dd')?.className).toContain('font-mono');
	});

	it('multiline keeps line breaks in free text', () => {
		render({ items: [{ label: 'Reason', value: 'a b', multiline: true }] });
		expect(target.querySelector('dd')?.className).toContain('whitespace-pre-wrap');
	});

	it('a render snippet replaces the value', () => {
		const slug = createRawSnippet(() => ({ render: () => '<code>slug-1</code>' }));
		render({ items: [{ label: 'Slug', value: 'ignored', render: slug }] });
		expect(target.querySelector('dd code')?.textContent).toBe('slug-1');
		expect(defs()).toEqual(['slug-1']);
	});

	it('span 2 stretches the item across both columns', () => {
		render({
			items: [
				{ label: 'Reason', value: 'x', span: 2 },
				{ label: 'B', value: 'y' }
			]
		});
		const rows = target.querySelectorAll('dl > div');
		expect(rows[0]?.className).toContain('sm:col-span-2');
		expect(rows[1]?.className).not.toContain('col-span');
	});

	it('cols sets the grid width', () => {
		render({ items: [{ label: 'A', value: '1' }], cols: 3 });
		expect(target.querySelector('dl')?.className).toContain('lg:grid-cols-3');
	});
});
