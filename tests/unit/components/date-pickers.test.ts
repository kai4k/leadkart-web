import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { CalendarDate } from '@internationalized/date';
import en from '../../../src/lib/i18n/locales/en.json';
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
		const alert = target.querySelector('[data-slot="field-error"]')!;
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

describe('date picker: year dropdown and announced value', () => {
	const yearSelect = () =>
		document.querySelector<HTMLSelectElement>(`select[aria-label="${en.form.calendar.year}"]`);

	it('offers a year dropdown and choosing a year changes the visible month', async () => {
		const trigger = render(DatePicker, {
			value: START,
			placeholder: START,
			minYear: 1990,
			maxYear: 2030
		});
		await open(trigger);
		const select = yearSelect()!;
		expect(select).not.toBeNull();
		const years = [...select.options].map((o) => o.value);
		expect(years[0]).toBe('1990');
		expect(years.at(-1)).toBe('2030');
		select.value = '1999';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		await vi.waitFor(() =>
			expect(document.querySelector('[data-bits-calendar-heading],[role="grid"]')).not.toBeNull()
		);
		await vi.waitFor(() => expect(yearSelect()!.value).toBe('1999'));
	});

	it('the default year range runs from 1900 to ten years ahead', async () => {
		await open(render(DatePicker, { placeholder: START }));
		const years = [...yearSelect()!.options].map((o) => Number(o.value));
		expect(years[0]).toBe(1900);
		expect(years.at(-1)).toBe(new Date().getFullYear() + 10);
	});

	it('names the previous / next month buttons', async () => {
		await open(render(DatePicker, { placeholder: START }));
		expect(
			document.querySelector(`button[aria-label="${en.form.calendar.previousMonth}"]`)
		).not.toBeNull();
		expect(
			document.querySelector(`button[aria-label="${en.form.calendar.nextMonth}"]`)
		).not.toBeNull();
	});

	it('the trigger is named by the label and the chosen value', () => {
		const trigger = render(DatePicker, { value: START });
		const ids = (trigger.getAttribute('aria-labelledby') ?? '').split(' ');
		expect(ids).toHaveLength(2);
		const name = ids.map((id) => document.getElementById(id)?.textContent?.trim()).join(' ');
		expect(name).toContain('When');
		expect(name).toContain('2026');
	});

	it('a range picker trigger is named by the label and the chosen range', () => {
		const trigger = render(DateRangePicker, {
			value: { start: START, end: new CalendarDate(2026, 5, 12) }
		});
		const name = (trigger.getAttribute('aria-labelledby') ?? '')
			.split(' ')
			.map((id) => document.getElementById(id)?.textContent?.trim())
			.join(' ');
		expect(name).toContain('When');
		expect(name).toContain('–');
	});
});
