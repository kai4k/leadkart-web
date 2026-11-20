import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import FileDropZone from '#lib/components/form/FileDropZone.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

describe('FileDropZone', () => {
	it('the hidden file input is not a second tab stop; the visible button is the only one', () => {
		target = document.body.appendChild(document.createElement('div'));
		component = mount(FileDropZone, { target, props: { label: 'Attachment' } as never });
		flushSync();
		const input = target.querySelector<HTMLInputElement>('input[type="file"]')!;
		expect(input.getAttribute('tabindex')).toBe('-1');
		expect(target.querySelector('button')).not.toBeNull();
	});
});
