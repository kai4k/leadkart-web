import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import StatusChips from '#lib/components/data/StatusChips.svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

const OPTIONS = [
	{ value: 'active', label: 'Active', count: 12 },
	{ value: 'suspended', label: 'Suspended', count: 3 },
	{ value: 'pending', label: 'Pending' }
];

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	const reactive = reactiveProps({
		label: 'Tenant status',
		options: OPTIONS,
		value: null,
		onChange: vi.fn(),
		...props
	});
	component = mount(StatusChips as never, { target, props: reactive });
	flushSync();
	return reactive;
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const chip = (name: string) =>
	[...target.querySelectorAll<HTMLElement>('[role="radio"],[role="button"],button')].find((b) =>
		b.textContent?.trim().startsWith(name)
	)!;

describe('StatusChips', () => {
	it('is a group with an accessible name', () => {
		render({});
		const group = target.querySelector('[role="group"],[role="radiogroup"]')!;
		expect(group.getAttribute('aria-label')).toBe('Tenant status');
	});

	it('offers All first, then every option', () => {
		render({});
		const names = [...target.querySelectorAll('[data-slot="toggle-group-item"]')].map((b) =>
			b.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(names).toEqual(['All', 'Active 12', 'Suspended 3', 'Pending']);
	});

	it('clicking a chip reports its value', () => {
		const onChange = vi.fn();
		render({ onChange });
		chip('Suspended').click();
		flushSync();
		expect(onChange).toHaveBeenCalledWith('suspended');
	});

	it('clicking All reports null', () => {
		const onChange = vi.fn();
		render({ onChange, value: 'suspended' });
		chip('All').click();
		flushSync();
		expect(onChange).toHaveBeenCalledWith(null);
	});

	it('clicking the chip that is on reports null instead of leaving no chip on', () => {
		const onChange = vi.fn();
		render({ onChange, value: 'suspended' });
		chip('Suspended').click();
		flushSync();
		expect(onChange).toHaveBeenCalledWith(null);
	});

	it('marks the current value as pressed and All when there is none', () => {
		const props = render({ value: 'active' });
		expect(chip('Active').getAttribute('data-state')).toBe('on');
		expect(chip('All').getAttribute('data-state')).toBe('off');
		props.value = null;
		flushSync();
		expect(chip('All').getAttribute('data-state')).toBe('on');
		expect(chip('Active').getAttribute('data-state')).toBe('off');
	});
});
