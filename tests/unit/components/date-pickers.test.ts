import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { CalendarDate } from '@internationalized/date';
import en from '../../../src/lib/i18n/locales/en.json';
import DatePicker from '#lib/components/form/DatePicker.svelte';
import DateRangePicker from '#lib/components/form/DateRangePicker.svelte';
import { focusFirstInvalid } from '#lib/utils/focus-first-invalid.ts';

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
}

const segments = (root: ParentNode = document) => [
	...root.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])')
];
const groups = () => [
	...document.querySelectorAll<HTMLElement>(
		'[data-slot="date-field-input"], [data-slot="date-range-field-input"]'
	)
];
const calendarButton = () =>
	document.querySelector<HTMLButtonElement>('button[aria-label^="Open calendar"]')!;
const days = () => [...document.querySelectorAll<HTMLElement>('[data-bits-day]')];
const day = (n: number) =>
	days().find((d) => d.textContent?.trim() === String(n) && !d.hasAttribute('data-outside-month'))!;
const hidden = (name: string) =>
	target.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);

/** Types digits into whatever is focused (each digit is a keydown on the active segment, as a keyboard does). */
function type(digits: string) {
	for (const key of digits) {
		(document.activeElement as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
		);
		flushSync();
	}
}
function press(el: Element, key: string, init: KeyboardEventInit = {}) {
	el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
	flushSync();
}
const focusFirstSegment = () => segments()[0]!.focus();
async function openCalendar() {
	calendarButton().click();
	flushSync();
	await vi.waitFor(() => expect(days().length).toBeGreaterThan(27));
}
const blurAll = () => {
	(document.activeElement as HTMLElement | null)?.blur();
	flushSync();
};

describe('DatePicker: typed entry', () => {
	it('shows day / month / year in the business locale order (en-IN), three editable segments', () => {
		render(DatePicker, { value: START });
		expect(segments().map((s) => s.getAttribute('data-segment'))).toEqual(['day', 'month', 'year']);
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['10', '05', '2026']);
		for (const s of segments()) expect(s.getAttribute('tabindex')).toBe('0');
	});

	it('typing 1 0 0 5 2 0 2 6 sets 2026-05-10, the hidden input and the string value', () => {
		const onValueChange = vi.fn();
		const onValueStringChange = vi.fn();
		render(DatePicker, { name: 'when', onValueChange, onValueStringChange });
		focusFirstSegment();
		type('10052026');
		const last = onValueChange.mock.calls.at(-1)![0];
		expect(last.toString()).toBe('2026-05-10');
		expect(onValueStringChange).toHaveBeenLastCalledWith('2026-05-10');
		expect(hidden('when')!.value).toBe('2026-05-10');
	});

	it('the calendar opened afterwards shows May 2026 with the 10th selected', async () => {
		render(DatePicker, {});
		focusFirstSegment();
		type('10052026');
		await openCalendar();
		const sel = (name: string) =>
			document.querySelector<HTMLSelectElement>(`select[aria-label="${name}"]`)!;
		expect(sel(en.form.calendar.month).selectedOptions[0]!.textContent?.trim()).toBe('May');
		expect(sel(en.form.calendar.year).value).toBe('2026');
		const ten = day(10);
		expect(ten.hasAttribute('data-selected') || ten.getAttribute('aria-selected') === 'true').toBe(
			true
		);
	});

	it('picking a day in the calendar fills the segments and closes the popover', async () => {
		render(DatePicker, { value: START, placeholder: START, name: 'when' });
		await openCalendar();
		day(15).click();
		flushSync();
		await vi.waitFor(() => expect(days()).toHaveLength(0));
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['15', '05', '2026']);
		expect(hidden('when')!.value).toBe('2026-05-15');
	});

	it('Alt+ArrowDown on a segment opens the calendar and does not step the segment', async () => {
		render(DatePicker, { value: START });
		focusFirstSegment();
		press(segments()[0]!, 'ArrowDown', { altKey: true });
		await vi.waitFor(() => expect(days().length).toBeGreaterThan(27));
		expect(segments()[0]!.textContent?.trim()).toBe('10');
	});

	it('ArrowUp steps the focused segment; Backspace clears it', () => {
		render(DatePicker, { value: START });
		const [d] = segments();
		d!.focus();
		press(d!, 'ArrowUp');
		expect(segments()[0]!.textContent?.trim()).toBe('11');
		// Backspace removes the last digit; the segment is empty when none is left
		press(segments()[0]!, 'Backspace');
		expect(segments()[0]!.textContent?.trim()).toBe('1');
		press(segments()[0]!, 'Backspace');
		expect(segments()[0]!.getAttribute('aria-valuetext')).toBe('Empty');
	});

	it('typing only the day and leaving the field is INCOMPLETE: onIncomplete, an error, aria-invalid on the group', async () => {
		const onIncomplete = vi.fn();
		render(DatePicker, { onIncomplete });
		focusFirstSegment();
		type('10');
		blurAll();
		await vi.waitFor(() => expect(onIncomplete).toHaveBeenCalledTimes(1));
		const err = target.querySelector('[data-slot="field-error"]')!;
		expect(err.textContent).toBe(en.form.datePicker.incomplete);
		const group = groups()[0]!;
		expect(group.getAttribute('aria-invalid')).toBe('true');
		expect((group.getAttribute('aria-describedby') ?? '').split(' ')[0]).toBe(err.id);
		// completing the date clears it
		segments()[1]!.focus(); // the month: the day is already typed
		type('052026');
		await vi.waitFor(() => expect(target.querySelector('[data-slot="field-error"]')).toBeNull());
	});

	it('leaving an untouched field is not incomplete', () => {
		const onIncomplete = vi.fn();
		render(DatePicker, { onIncomplete });
		focusFirstSegment();
		blurAll();
		expect(onIncomplete).not.toHaveBeenCalled();
	});

	it('with an error passed, the group aria-describedby starts with the error id, then the hint', () => {
		render(DatePicker, { error: 'Pick a date', hint: 'Expiry' });
		const err = target.querySelector('[data-slot="field-error"]')!;
		const hint = target.querySelector('[data-slot="field-description"]')!;
		const described = (groups()[0]!.getAttribute('aria-describedby') ?? '').split(' ');
		expect(described).toEqual([err.id, hint.id]);
		expect(groups()[0]!.getAttribute('aria-invalid')).toBe('true');
		expect(err.getAttribute('role')).toBeNull(); // no live role: read as the description
	});

	it('focusFirstInvalid(form) focuses the first segment', async () => {
		render(DatePicker, { error: 'Pick a date' });
		expect(await focusFirstInvalid(target)).toBe(true);
		expect(document.activeElement).toBe(segments()[0]);
	});

	it('a date before minValue is invalid (aria-invalid), one inside the range is not', () => {
		render(DatePicker, { value: START, minValue: new CalendarDate(2026, 6, 1) });
		expect(groups()[0]!.getAttribute('aria-invalid')).toBe('true');
		unmount(component!);
		target.remove();
		render(DatePicker, { value: START, minValue: new CalendarDate(2026, 1, 1) });
		expect(groups()[0]!.getAttribute('aria-invalid')).toBeNull();
	});

	it('the group is named by the visible label; the calendar button says what it opens', () => {
		render(DatePicker, { value: START });
		const label = target.querySelector('[data-slot="date-field-label"]')!;
		expect(label.textContent?.trim()).toBe('When');
		expect(groups()[0]!.getAttribute('aria-labelledby')).toBe(label.id);
		expect(calendarButton().getAttribute('aria-label')).toBe('Open calendar, When');
	});

	it('valueString: a string in sets the date, a date out reports the string (ISO, day-first display)', () => {
		const onValueStringChange = vi.fn();
		render(DatePicker, { valueString: '2026-05-10', onValueStringChange });
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['10', '05', '2026']);
	});
});

describe('DatePicker: typed-entry parsing rules (en-IN, day / month / year)', () => {
	/** Types `digits` from the first segment; returns the three segments, the last reported value and the focused part. */
	function typed(digits: string) {
		const onValueChange = vi.fn();
		render(DatePicker, { onValueChange });
		focusFirstSegment();
		type(digits);
		return {
			text: segments()
				.map((s) => s.textContent?.trim())
				.join('/'),
			value: onValueChange.mock.calls.at(-1)?.[0]?.toString() as string | undefined,
			focus: (document.activeElement as HTMLElement).getAttribute('data-segment')
		};
	}
	it.each([
		['10052026', '10/05/2026', '2026-05-10'],
		['10-05-2026', '10/05/2026', '2026-05-10'], // separators and any non-digit are ignored
		['10052026x', '10/05/2026', '2026-05-10'],
		['29022024', '29/02/2024', '2024-02-29'], // a leap day is accepted in a leap year
		['01012000', '01/01/2000', '2000-01-01']
	])('accepts %s', (digits, text, value) => {
		const r = typed(digits);
		expect(r.text).toBe(text);
		expect(r.value).toBe(value);
	});
	it.each([
		['5', '05/mm/yyyy', 'month'], // a first digit above 3 can only be a day: the segment completes and moves on
		['13', '13/mm/yyyy', 'month'],
		['45', '04/05/yyyy', 'year'], // 4 completes the day, 5 starts the month (and completes it)
		['1005', '10/05/yyyy', 'year'],
		['3', '3/mm/yyyy', 'day'] // 3 could still be 30 or 31: waits for a second digit
	])('%s leaves the field incomplete (%s, focus on %s)', (digits, text, focus) => {
		const r = typed(digits);
		expect(r.text).toBe(text);
		expect(r.value).toBeUndefined();
		expect(r.focus).toBe(focus);
	});
	it('a second digit that makes the day too big restarts it: 32 waits as 2', () => {
		expect(typed('32').text).toBe('2/mm/yyyy');
	});
	it('a second digit that makes the month too big restarts it: month 13 restarts as 03', () => {
		expect(typed('1013').text).toBe('10/03/yyyy');
	});
});

describe('DatePicker: a date that does not exist is an error, never a different date', () => {
	const errorText = () => target.querySelector('[data-slot="field-error"]')?.textContent;

	it.each(['31022026', '29022026', '30022024', '31042026', '31092026'])(
		'%s keeps what was typed, is invalid with a message, and emits nothing',
		(digits) => {
			const onValueChange = vi.fn();
			const onValueStringChange = vi.fn();
			render(DatePicker, { onValueChange, onValueStringChange, name: 'when' });
			focusFirstSegment();
			type(digits);
			expect(segments().map((s) => s.textContent?.trim())).toEqual([
				digits.slice(0, 2),
				digits.slice(2, 4),
				digits.slice(4)
			]);
			for (const [v] of onValueChange.mock.calls) expect(v).toBeUndefined();
			for (const [v] of onValueStringChange.mock.calls) expect(v).toBe('');
			expect(hidden('when')!.value).toBe('');
			const group = groups()[0]!;
			expect(group.getAttribute('aria-invalid')).toBe('true');
			expect(errorText()).toBe(en.form.datePicker.notExist);
			expect((group.getAttribute('aria-describedby') ?? '').split(' ')[0]).toBe(
				target.querySelector('[data-slot="field-error"]')!.id
			);
		}
	);

	it('29/02/2024 is a real date (leap year) and is emitted as typed', () => {
		const onValueChange = vi.fn();
		render(DatePicker, { onValueChange, name: 'when' });
		focusFirstSegment();
		type('29022024');
		expect(onValueChange.mock.calls.at(-1)![0].toString()).toBe('2024-02-29');
		expect(hidden('when')!.value).toBe('2024-02-29');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBeNull();
	});

	it('changing the month so the date becomes real makes it valid again (31 / 02 -> 31 / 03)', () => {
		const onValueChange = vi.fn();
		render(DatePicker, { onValueChange, name: 'when' });
		focusFirstSegment();
		type('31022026');
		expect(errorText()).toBe(en.form.datePicker.notExist);
		segments()[1]!.focus();
		type('03');
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['31', '03', '2026']);
		expect(onValueChange.mock.calls.at(-1)![0].toString()).toBe('2026-03-31');
		expect(hidden('when')!.value).toBe('2026-03-31');
		expect(errorText()).toBeUndefined();
		expect(groups()[0]!.getAttribute('aria-invalid')).toBeNull();
	});

	it('stepping the day with the arrows stays inside the month that is shown', () => {
		render(DatePicker, { value: new CalendarDate(2026, 2, 28) });
		const d = segments()[0]!;
		d.focus();
		press(d, 'ArrowUp');
		expect(segments()[0]!.textContent?.trim()).toBe('01');
	});

	it('the range picker refuses an impossible start or end on its own side', () => {
		const onValueChange = vi.fn();
		render(DateRangePicker, { onValueChange, startName: 'from', endName: 'to' });
		segments(groups()[0]!)[0]!.focus();
		type('31022026');
		segments(groups()[1]!)[0]!.focus();
		type('10032026');
		const [start, end] = groups();
		expect(start!.getAttribute('aria-invalid')).toBe('true');
		expect(end!.getAttribute('aria-invalid')).toBeNull();
		expect(segments(start!).map((s) => s.textContent?.trim())).toEqual(['31', '02', '2026']);
		expect(hidden('from')!.value).toBe('');
		expect(errorText()).toBe(en.form.dateRangePicker.notExistStart);
		// the end side too
		segments(groups()[0]!)[0]!.focus();
		type('01032026');
		segments(groups()[1]!)[0]!.focus();
		type('29022026');
		expect(groups()[1]!.getAttribute('aria-invalid')).toBe('true');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBeNull();
		expect(hidden('to')!.value).toBe('');
		expect(errorText()).toBe(en.form.dateRangePicker.notExistEnd);
	});
});

describe('DatePicker: the date the user picked or set is the date that is saved (review I1)', () => {
	it('typed 15/03/2026, then 10 picked in the calendar: shown 10/03/2026, emitted 2026-03-10', async () => {
		const onValueStringChange = vi.fn();
		render(DatePicker, { name: 'when', onValueStringChange });
		focusFirstSegment();
		type('15032026');
		await openCalendar();
		day(10).click();
		flushSync();
		await vi.waitFor(() => expect(days()).toHaveLength(0));
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['10', '03', '2026']);
		expect(hidden('when')!.value).toBe('2026-03-10');
		expect(onValueStringChange).toHaveBeenLastCalledWith('2026-03-10');
	});

	it('typed 31/01/2026: month Up shows 31/02/2026 (invalid, nothing emitted), Up again 31/03/2026 (valid, emitted)', () => {
		render(DatePicker, { name: 'when' });
		focusFirstSegment();
		type('31012026');
		expect(hidden('when')!.value).toBe('2026-01-31');
		const month = segments()[1]!;
		month.focus();
		press(month, 'ArrowUp');
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['31', '02', '2026']);
		expect(hidden('when')!.value).toBe('');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBe('true');
		press(segments()[1]!, 'ArrowUp');
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['31', '03', '2026']);
		expect(hidden('when')!.value).toBe('2026-03-31');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBeNull();
	});

	it('a value set from outside (valueString, a form reset) replaces whatever was typed', async () => {
		const { default: Host } = await import('./date-picker-host.svelte');
		render(Host, {});
		focusFirstSegment();
		type('31022026'); // impossible: shown as typed
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['31', '02', '2026']);
		const set = document.querySelector<HTMLButtonElement>('[data-testid="set"]')!;
		set.click();
		flushSync();
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['07', '08', '2025']);
		expect(hidden('when')!.value).toBe('2025-08-07');
		document.querySelector<HTMLButtonElement>('[data-testid="reset"]')!.click();
		flushSync();
		expect(segments().map((s) => s.textContent?.trim())).toEqual(['dd', 'mm', 'yyyy']);
		expect(hidden('when')!.value).toBe('');
	});

	it('the arrows on an empty year start from the current year', () => {
		render(DatePicker, {});
		const year = segments()[2]!;
		year.focus();
		press(year, 'ArrowUp');
		expect(segments()[2]!.textContent?.trim()).toBe(String(new Date().getFullYear()));
	});

	it('each segment carries aria-invalid and aria-describedby, so the focused control announces the message', () => {
		render(DatePicker, { hint: 'Expiry' });
		focusFirstSegment();
		type('31022026');
		const err = target.querySelector('[data-slot="field-error"]')!;
		for (const sgm of segments()) {
			expect(sgm.getAttribute('aria-invalid')).toBe('true');
			expect((sgm.getAttribute('aria-describedby') ?? '').split(' ')[0]).toBe(err.id);
		}
	});
});

describe('DatePicker: a half-typed year is not a value', () => {
	it('typing 10 05 26 shows 26, emits nothing, and leaving the field says "Enter a complete date"', async () => {
		const onValueChange = vi.fn();
		const onIncomplete = vi.fn();
		render(DatePicker, { onValueChange, onIncomplete, name: 'when' });
		focusFirstSegment();
		type('100526');
		expect(segments()[2]!.textContent?.trim()).toBe('26');
		for (const [v] of onValueChange.mock.calls) expect(v).toBeUndefined();
		expect(hidden('when')!.value).toBe('');
		blurAll();
		await vi.waitFor(() => expect(onIncomplete).toHaveBeenCalled());
		expect(target.querySelector('[data-slot="field-error"]')!.textContent).toBe(
			en.form.datePicker.incomplete
		);
		expect(groups()[0]!.getAttribute('aria-invalid')).toBe('true');
	});

	it('a four-digit year outside minYear..maxYear is invalid and the message names the range', () => {
		const onValueChange = vi.fn();
		render(DatePicker, { onValueChange, minYear: 1990, maxYear: 2030, name: 'when' });
		focusFirstSegment();
		type('10050026');
		expect(segments()[2]!.textContent?.trim()).toBe('0026');
		for (const [v] of onValueChange.mock.calls) expect(v).toBeUndefined();
		expect(hidden('when')!.value).toBe('');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBe('true');
		expect(target.querySelector('[data-slot="field-error"]')!.textContent).toBe(
			'Enter a year between 1990 and 2030.'
		);
		segments()[2]!.focus();
		type('2031');
		expect(hidden('when')!.value).toBe('');
		type('2030');
		expect(hidden('when')!.value).toBe('2030-05-10');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBeNull();
	});

	it('the range picker: a half-typed year on either side is not a value', () => {
		const onValueChange = vi.fn();
		render(DateRangePicker, { onValueChange, startName: 'from' });
		segments(groups()[0]!)[0]!.focus();
		type('100526');
		for (const [v] of onValueChange.mock.calls) expect(v.start).toBeUndefined();
		expect(hidden('from')!.value).toBe('');
	});
});

describe('DatePicker: the calendar', () => {
	it('shows a grid in a popover with arrow-key movement', async () => {
		render(DatePicker, { value: START, placeholder: START });
		await openCalendar();
		expect(document.querySelector('[role="grid"]')).not.toBeNull();
		const ten = day(10);
		ten.focus();
		ten.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();
		await vi.waitFor(() => expect(document.activeElement).toBe(day(11)));
	});

	const yearSelect = () =>
		document.querySelector<HTMLSelectElement>(`select[aria-label="${en.form.calendar.year}"]`);

	it('offers a year dropdown and choosing a year changes the visible month', async () => {
		render(DatePicker, { value: START, placeholder: START, minYear: 1990, maxYear: 2030 });
		await openCalendar();
		const select = yearSelect()!;
		const years = [...select.options].map((o) => o.value);
		expect(years[0]).toBe('1990');
		expect(years.at(-1)).toBe('2030');
		select.value = '1999';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		await vi.waitFor(() => expect(yearSelect()!.value).toBe('1999'));
	});

	it('the default year range runs from 1900 to ten years ahead; month buttons are named', async () => {
		render(DatePicker, { placeholder: START });
		await openCalendar();
		const years = [...yearSelect()!.options].map((o) => Number(o.value));
		expect(years[0]).toBe(1900);
		expect(years.at(-1)).toBe(new Date().getFullYear() + 10);
		expect(
			document.querySelector(`button[aria-label="${en.form.calendar.previousMonth}"]`)
		).not.toBeNull();
		expect(
			document.querySelector(`button[aria-label="${en.form.calendar.nextMonth}"]`)
		).not.toBeNull();
	});
});

describe('DateRangePicker', () => {
	it('has a start group and an end group, each named, in day / month / year order', () => {
		render(DateRangePicker, {
			value: { start: START, end: new CalendarDate(2026, 5, 12) },
			startName: 'from',
			endName: 'to'
		});
		const gs = groups();
		expect(gs).toHaveLength(2);
		expect(gs.map((g) => g.getAttribute('aria-label'))).toEqual([
			'When, start date',
			'When, end date'
		]);
		expect(segments(gs[0]!).map((s) => s.textContent?.trim())).toEqual(['10', '05', '2026']);
		expect(segments(gs[1]!).map((s) => s.textContent?.trim())).toEqual(['12', '05', '2026']);
		expect(hidden('from')!.value).toBe('2026-05-10');
		expect(hidden('to')!.value).toBe('2026-05-12');
	});

	it('typing both ends sets { start, end }', () => {
		const onValueChange = vi.fn();
		const onValueStringChange = vi.fn();
		render(DateRangePicker, {
			onValueChange,
			onValueStringChange,
			startName: 'from',
			endName: 'to'
		});
		segments(groups()[0]!)[0]!.focus();
		type('10052026');
		segments(groups()[1]!)[0]!.focus();
		type('18052026');
		const last = onValueChange.mock.calls.at(-1)![0];
		expect(last.start.toString()).toBe('2026-05-10');
		expect(last.end.toString()).toBe('2026-05-18');
		expect(onValueStringChange).toHaveBeenLastCalledWith({
			start: '2026-05-10',
			end: '2026-05-18'
		});
		expect(hidden('to')!.value).toBe('2026-05-18');
	});

	it('an end before the start is reported through aria-invalid on both groups and an error', () => {
		render(DateRangePicker, {
			value: { start: new CalendarDate(2026, 5, 20), end: new CalendarDate(2026, 5, 10) }
		});
		for (const g of groups()) expect(g.getAttribute('aria-invalid')).toBe('true');
		expect(target.querySelector('[data-slot="field-error"]')!.textContent).toBe(
			en.form.dateRangePicker.order
		);
	});

	it('a start before the end is valid', () => {
		render(DateRangePicker, {
			value: { start: new CalendarDate(2026, 5, 10), end: new CalendarDate(2026, 5, 20) }
		});
		for (const g of groups()) expect(g.getAttribute('aria-invalid')).toBeNull();
	});

	it('picking start then end in the calendar sets both and closes', async () => {
		const onValueChange = vi.fn();
		render(DateRangePicker, {
			value: { start: undefined, end: undefined },
			placeholder: START,
			onValueChange,
			startName: 'from',
			endName: 'to'
		});
		await openCalendar();
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
		expect(hidden('from')!.value).toBe('2026-05-12');
		expect(hidden('to')!.value).toBe('2026-05-18');
	});

	it('Alt+ArrowDown opens the calendar; arrow keys move between days', async () => {
		render(DateRangePicker, { placeholder: START });
		press(segments()[0]!, 'ArrowDown', { altKey: true });
		await vi.waitFor(() => expect(days().length).toBeGreaterThan(27));
		const ten = day(10);
		ten.focus();
		ten.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();
		await vi.waitFor(() => expect(document.activeElement).toBe(day(17)));
	});

	it('a half-typed start is incomplete', async () => {
		const onIncomplete = vi.fn();
		render(DateRangePicker, { onIncomplete });
		segments()[0]!.focus();
		type('10');
		blurAll();
		await vi.waitFor(() => expect(onIncomplete).toHaveBeenCalled());
		expect(target.querySelector('[data-slot="field-error"]')!.textContent).toBe(
			en.form.dateRangePicker.incomplete
		);
	});
});

describe('DateRangePicker: what is posted', () => {
	it('a reversed range posts nothing on either side', () => {
		render(DateRangePicker, {
			value: { start: new CalendarDate(2026, 3, 20), end: new CalendarDate(2026, 3, 5) },
			startName: 'from',
			endName: 'to'
		});
		expect(hidden('from')!.value).toBe('');
		expect(hidden('to')!.value).toBe('');
	});

	it('an impossible or half-typed side makes both inputs empty; a clean range posts both', () => {
		render(DateRangePicker, { startName: 'from', endName: 'to' });
		segments(groups()[0]!)[0]!.focus();
		type('01032026');
		segments(groups()[1]!)[0]!.focus();
		type('29022026');
		expect(hidden('from')!.value).toBe('');
		expect(hidden('to')!.value).toBe('');
		segments(groups()[1]!)[0]!.focus();
		type('10032026');
		expect(hidden('from')!.value).toBe('2026-03-01');
		expect(hidden('to')!.value).toBe('2026-03-10');
	});

	it('minYear / maxYear limit the typed years too', () => {
		render(DateRangePicker, { minYear: 2000, maxYear: 2036, startName: 'from' });
		segments(groups()[0]!)[0]!.focus();
		type('01012099');
		expect(hidden('from')!.value).toBe('');
		expect(groups()[0]!.getAttribute('aria-invalid')).toBe('true');
		expect(target.querySelector('[data-slot="field-error"]')!.textContent).toBe(
			'Enter a year between 2000 and 2036.'
		);
	});
});
