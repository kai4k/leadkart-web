import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import Host from './date-picker-constraint-host.svelte';

/**
 * What a date field shows is what it submits: after constraint changes (min / max / year bounds), multi-digit input,
 * paste, IME / Android composition, and resets. Probe rows are the review's I3, M2, M3, M4 and M8.
 */

beforeAll(() => {
	Element.prototype.scrollIntoView = vi.fn();
});

type HostProps = {
	min?: string;
	max?: string;
	minYear?: number;
	maxYear?: number;
	dir?: 'ltr' | 'rtl';
	onSubmit?: () => void;
	onValueString?: (v: string | undefined) => void;
};
let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: HostProps;
const onValueString = vi.fn();

function setup(init: HostProps = {}) {
	vi.clearAllMocks();
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps<HostProps>({ onValueString, ...init });
	component = mount(Host as never, { target, props: props as never });
	flushSync();
	segs()[0]!.focus();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const segs = () => [
	...target.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])')
];
const group = () => target.querySelector<HTMLElement>('[data-slot="date-field-input"]')!;
const hidden = () => target.querySelector<HTMLInputElement>('input[type="hidden"][name="when"]')!;
const shown = () => segs().map((s) => (s as HTMLInputElement).value);
const invalid = () => group().getAttribute('aria-invalid') === 'true';
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => {
	el.dispatchEvent(
		new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })
	);
	flushSync();
};
const type = (digits: string) => {
	for (const d of digits) key(document.activeElement!, d);
};
// what a virtual keyboard does: the text lands in the input's value, then `input` fires
const inputText = (el: Element, text: string, init: InputEventInit = {}) => {
	(el as HTMLInputElement).value = text;
	el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true, ...init }));
	flushSync();
};
const paste = (el: Element, text: string) => {
	const e = new Event('paste', { bubbles: true, cancelable: true }) as Event & {
		clipboardData: { getData: () => string };
	};
	e.clipboardData = { getData: () => text };
	el.dispatchEvent(e);
	flushSync();
};

describe('I3: a constraint change re-checks AND re-emits', () => {
	it('relaxing min: a date that was outside is now valid and is emitted', () => {
		setup({ min: '2026-03-10' });
		type('05032026');
		expect(invalid()).toBe(true);
		expect(hidden().value).toBe('');
		props.min = '2000-01-01';
		flushSync();
		expect(invalid()).toBe(false);
		expect(shown().join('/')).toBe('05/03/2026');
		expect(hidden().value).toBe('2026-03-05');
		expect(onValueString).toHaveBeenLastCalledWith('2026-03-05');
	});

	it('tightening min: a date that is now outside is not submitted, and the string side follows', () => {
		setup();
		type('15032026');
		expect(hidden().value).toBe('2026-03-15');
		props.min = '2026-04-01';
		flushSync();
		expect(invalid()).toBe(true);
		expect(hidden().value).toBe('');
		expect(onValueString).toHaveBeenLastCalledWith(''); // the empty string is "no date"
	});

	it('max and the year bounds behave the same', () => {
		setup();
		type('15032026');
		props.max = '2026-03-01';
		flushSync();
		expect(hidden().value).toBe('');
		props.max = undefined;
		flushSync();
		expect(hidden().value).toBe('2026-03-15');
		props.maxYear = 2025;
		flushSync();
		expect(invalid()).toBe(true);
		expect(hidden().value).toBe('');
		props.maxYear = 2030;
		flushSync();
		expect(hidden().value).toBe('2026-03-15');
	});

	it('property: 150 random sequences of typing and constraint changes never show one thing and submit another', () => {
		let a = 20261122;
		const rnd = () => {
			a = (a + 0x6d2b79f5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const mins = [undefined, '2000-01-01', '2026-03-10', '2026-04-01'];
		const maxs = [undefined, '2026-03-01', '2027-01-01', '2099-01-01'];
		for (let seq = 0; seq < 150; seq++) {
			setup();
			const dates = ['15032026', '05032026', '31012026', '29022028', '10102025'];
			for (let step = 0; step < 8; step++) {
				const x = rnd();
				if (x < 0.35) {
					segs()[0]!.focus();
					type(dates[Math.floor(rnd() * dates.length)]!);
				} else if (x < 0.6) props.min = mins[Math.floor(rnd() * mins.length)];
				else if (x < 0.85) props.max = maxs[Math.floor(rnd() * maxs.length)];
				else props.maxYear = rnd() < 0.5 ? 2025 : undefined;
				flushSync();
				const [d, m, y] = shown();
				const emitted = hidden().value;
				if (emitted) {
					expect(emitted, `seq ${seq} step ${step}`).toBe(`${y}-${m}-${d}`);
					expect(invalid(), `seq ${seq} step ${step}: emitted but marked invalid`).toBe(false);
				} else if (/^\d\d$/.test(d!) && /^\d\d$/.test(m!) && /^\d{4}$/.test(y!)) {
					const iso = `${y}-${m}-${d}`;
					const real = new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso;
					const inRange =
						(!props.min || iso >= props.min) &&
						(!props.max || iso <= props.max) &&
						Number(y) <= (props.maxYear ?? Number.MAX_SAFE_INTEGER) &&
						Number(y) >= 1900;
					expect(real && inRange, `seq ${seq} step ${step}: ${iso} is valid but not emitted`).toBe(
						false
					);
					expect(invalid(), `seq ${seq} step ${step}: ${iso} must be marked invalid`).toBe(true);
				}
			}
			unmount(component!);
			component = undefined;
			target.remove();
		}
	}, 120_000);
});

describe('M2: several digits in one input event, and paste', () => {
	it('15032026 in one input event lands as 15/03/2026', () => {
		setup();
		inputText(segs()[0]!, '15032026');
		expect(shown()).toEqual(['15', '03', '2026']);
		expect(hidden().value).toBe('2026-03-15');
	});

	it.each([
		['15/03/2026', '2026-03-15'],
		['5/3/2026', '2026-03-05'],
		['15-03-2026', '2026-03-15'],
		['15.03.2026', '2026-03-15'],
		['2026-03-15', '2026-03-15'],
		[' 15/03/2026 \n', '2026-03-15']
	])('paste %j is accepted', (text, iso) => {
		setup();
		paste(segs()[0]!, text);
		expect(hidden().value).toBe(iso);
		expect(invalid()).toBe(false);
	});

	it.each(['03/04/26', '15/03/26', '15032026x', 'tomorrow', '15/03', '2026/03/15', '1/2/3/4'])(
		'paste %j is refused (a two-digit year is never guessed)',
		(text) => {
			setup();
			paste(segs()[0]!, text);
			expect(hidden().value).toBe('');
			expect(shown()).toEqual(['', '', '']);
		}
	);

	it('a pasted impossible date is shown as pasted and is invalid, never another date', () => {
		setup();
		paste(segs()[0]!, '31/02/2026');
		expect(shown().join('/')).toBe('31/02/2026');
		expect(invalid()).toBe(true);
		expect(hidden().value).toBe('');
	});
});

describe('M3: virtual keyboards and IMEs are read back from the input value', () => {
	it('a composition is left alone until compositionend, then its digits land in the segment', () => {
		setup();
		const day = segs()[0] as HTMLInputElement;
		day.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
		inputText(day, '1', { inputType: 'insertCompositionText', isComposing: true });
		expect(day.value).toBe('1'); // not rewritten while composing
		expect(day.getAttribute('aria-valuenow')).toBeNull(); // the state has not seen it yet
		day.value = '12';
		day.dispatchEvent(new CompositionEvent('compositionend', { data: '12', bubbles: true }));
		flushSync();
		expect(shown()[0]).toBe('12');
		expect(document.activeElement).toBe(segs()[1]); // a complete day moved on
	});

	it('an input event with no keydown key (key 229): the value is read back and made canonical', () => {
		setup();
		const day = segs()[0] as HTMLInputElement;
		key(day, 'Process', { keyCode: 229 });
		inputText(day, '7');
		expect(shown()[0]).toBe('07');
		expect(day.value).toBe('07');
	});

	it('letters an IME wrote are dropped: digits only, and the input is rewritten', () => {
		setup();
		const day = segs()[0] as HTMLInputElement;
		inputText(day, 'ab3');
		expect(shown()[0]).toBe('3'); // 3 can still become 30 or 31: it waits
		expect(day.value).toBe('3');
	});

	it('typing over the selected content replaces it', () => {
		setup();
		type('15');
		segs()[0]!.focus();
		const day = segs()[0] as HTMLInputElement;
		expect(day.selectionStart).toBe(0);
		expect(day.selectionEnd).toBe(2);
		inputText(day, '5');
		expect(shown()[0]).toBe('05');
	});

	it('the segments are numeric text inputs', () => {
		setup();
		for (const s of segs()) {
			expect(s.tagName).toBe('INPUT');
			expect(s.getAttribute('type')).toBe('text');
			expect(s.getAttribute('inputmode')).toBe('numeric');
			expect(s.getAttribute('autocomplete')).toBe('off');
			expect(s.getAttribute('pattern')).toBe('[0-9]*');
			expect(s.getAttribute('role')).toBe('spinbutton');
		}
	});
});

describe('M4: reset', () => {
	it('the form native reset clears typed text that is not a value (15/0/yyyy) and an impossible date with its error', () => {
		setup();
		type('150');
		expect(shown()).toEqual(['15', '0', '']);
		target.querySelector<HTMLButtonElement>('[data-testid="native-reset"]')!.click();
		flushSync();
		expect(shown()).toEqual(['', '', '']);
		segs()[0]!.focus();
		type('31022026');
		expect(invalid()).toBe(true);
		target.querySelector<HTMLButtonElement>('[data-testid="native-reset"]')!.click();
		flushSync();
		expect(shown()).toEqual(['', '', '']);
		expect(invalid()).toBe(false);
	});

	it('clear() does the same for a programmatic reset', () => {
		setup();
		type('31022026');
		target.querySelector<HTMLButtonElement>('[data-testid="clear"]')!.click();
		flushSync();
		expect(shown()).toEqual(['', '', '']);
		expect(invalid()).toBe(false);
		expect(hidden().value).toBe('');
	});
});

describe('M8: Backspace, Enter, arrows', () => {
	it('Backspace on an empty segment goes back and deletes the previous one`s last digit', () => {
		setup();
		type('15'); // day 15, focus on month (empty)
		expect(document.activeElement).toBe(segs()[1]);
		key(segs()[1]!, 'Backspace');
		expect(document.activeElement).toBe(segs()[0]);
		expect(shown()[0]).toBe('1');
	});

	it('Enter on a segment submits the enclosing form, and the hint says so', () => {
		const onSubmit = vi.fn();
		setup({ onSubmit });
		expect(segs()[0]!.getAttribute('enterkeyhint')).toBe('done');
		key(segs()[0]!, 'Enter');
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('in a right-to-left page ArrowLeft goes to the NEXT segment (the one on the left)', () => {
		setup({ dir: 'rtl' });
		segs()[0]!.focus();
		key(segs()[0]!, 'ArrowLeft');
		expect(document.activeElement).toBe(segs()[1]);
		key(segs()[1]!, 'ArrowRight');
		expect(document.activeElement).toBe(segs()[0]);
	});

	it('in a left-to-right page ArrowRight goes to the next segment', () => {
		setup();
		key(segs()[0]!, 'ArrowRight');
		expect(document.activeElement).toBe(segs()[1]);
	});
});

describe('M1: the digit-run and non-digit branches (regexes written with their backslashes)', () => {
	it('a run of digits pasted into the day is typed from there on', () => {
		setup();
		paste(segs()[0]!, '15032026');
		expect(shown()).toEqual(['15', '03', '2026']);
		expect(hidden().value).toBe('2026-03-15');
	});

	it('digits with spaces around them are still a digit run', () => {
		setup();
		paste(segs()[0]!, '  15 \n');
		expect(shown()[0]).toBe('15');
	});

	it('a run of digits pasted into the year fills the year', () => {
		setup();
		paste(segs()[2]!, '2026');
		expect(shown()[2]).toBe('2026');
	});

	it('letters and symbols in a digit run are not a digit run (nothing is typed)', () => {
		setup();
		paste(segs()[0]!, '1a5');
		expect(shown()).toEqual(['', '', '']);
	});

	it('non-digits are stripped when the input value is read back (placeholder letters, an IME)', () => {
		setup();
		inputText(segs()[0]!, 'dd15');
		expect(shown()[0]).toBe('15');
	});
});
