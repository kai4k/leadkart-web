import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { CalendarDate } from '@internationalized/date';
import DatePicker from '#lib/components/form/DatePicker.svelte';
import DateRangePicker from '#lib/components/form/DateRangePicker.svelte';

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

const START = new CalendarDate(2026, 5, 10);

function render(C: unknown, props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(C as never, { target, props: { label: 'When', ...props } as never });
	flushSync();
	return target.querySelector<HTMLButtonElement>('button')!;
}

const days = () => [...document.querySelectorAll<HTMLElement>('[data-bits-day]')];
const day = (n: number) =>
	days().find((d) => d.textContent?.trim() === String(n) && !d.hasAttribute('data-outside-month'))!;

async function open(trigger: HTMLButtonElement) {
	trigger.click();
	flushSync();
	await vi.waitFor(() => expect(days().length).toBeGreaterThan(27));
}

describe('DatePicker', () => {
	it('is a button named by its label, with the formatted date', () => {
		const trigger = render(DatePicker, { value: START });
		expect(trigger.labels?.[0]?.textContent?.trim()).toBe('When');
		expect(trigger.textContent).toContain('2026');
	});

	it('shows a calendar grid in a popover and picking a day sets the value and closes', async () => {
		const onValueChange = vi.fn();
		const trigger = render(DatePicker, {
			value: START,
			placeholder: START,
			onValueChange,
			name: 'when'
		});
		await open(trigger);
		expect(document.querySelector('[role="grid"]')).not.toBeNull();
		day(15).click();
		flushSync();
		await vi.waitFor(() => expect(onValueChange).toHaveBeenCalled());
		expect(onValueChange.mock.calls[0]![0].toString()).toBe('2026-05-15');
		await vi.waitFor(() => expect(days()).toHaveLength(0));
		expect(target.querySelector<HTMLInputElement>('input[name="when"]')!.value).toBe('2026-05-15');
	});

	it('moves between days with the arrow keys', async () => {
		const trigger = render(DatePicker, { value: START, placeholder: START });
		await open(trigger);
		const ten = day(10);
		ten.focus();
		ten.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		await vi.waitFor(() => expect(document.activeElement).toBe(day(11)));
	});

	it('error sets aria-invalid, an alert and describedby with the hint', () => {
		const trigger = render(DatePicker, { error: 'Pick a date', hint: 'Expiry' });
		expect(trigger.getAttribute('aria-invalid')).toBe('true');
		const alert = target.querySelector('[role="alert"]')!;
		const described = (trigger.getAttribute('aria-describedby') ?? '').split(' ');
		expect(described).toContain(alert.id);
		expect(described).toHaveLength(2);
	});
});

describe('DateRangePicker', () => {
	it('shows the range, and picking start then end sets both and closes', async () => {
		const onValueChange = vi.fn();
		const trigger = render(DateRangePicker, {
			value: { start: undefined, end: undefined },
			placeholder: START,
			onValueChange,
			startName: 'from',
			endName: 'to'
		});
		expect(trigger.labels?.[0]?.textContent?.trim()).toBe('When');
		await open(trigger);
		day(12).click();
		flushSync();
		day(18).click();
		flushSync();
		await vi.waitFor(() => {
			const last = onValueChange.mock.calls.at(-1)?.[0];
			expect(last?.start?.toString()).toBe('2026-05-12');
			expect(last?.end?.toString()).toBe('2026-05-18');
		});
		await vi.waitFor(() => expect(days()).toHaveLength(0));
		expect(target.querySelector<HTMLInputElement>('input[name="from"]')!.value).toBe('2026-05-12');
		expect(target.querySelector<HTMLInputElement>('input[name="to"]')!.value).toBe('2026-05-18');
		expect(trigger.textContent).toContain('–');
	});

	it('moves between days with the arrow keys', async () => {
		const trigger = render(DateRangePicker, { placeholder: START });
		await open(trigger);
		const ten = day(10);
		ten.focus();
		ten.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();
		await vi.waitFor(() => expect(document.activeElement).toBe(day(17)));
	});
});
