import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Host from './date-picker-host.svelte';

/**
 * Displayed === emitted, for any keystroke sequence. After EVERY step, either nothing is emitted (the hidden input is
 * empty) and the field is not showing a real, complete date as if it were valid, or the emitted ISO string is exactly the
 * day, month and year the segments display. Deterministic seed (mulberry32), a few hundred sequences; the calendar steps
 * (open, month and year dropdowns, picking a day) are mixed into a smaller set of sequences because a popover is slow.
 */

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

function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const segs = () => [
	...target.querySelectorAll<HTMLElement>('[data-segment]:not([data-segment="literal"])')
];
const group = () => target.querySelector<HTMLElement>('[data-slot="date-field-input"]')!;
const hidden = () => target.querySelector<HTMLInputElement>('input[type="hidden"][name="when"]')!;
const key = (el: Element, k: string) => {
	el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
	flushSync();
};
const days = () => [...document.querySelectorAll<HTMLElement>('[data-bits-day]')];

const realDate = (d: number, m: number, y: number) => {
	const t = new Date(Date.UTC(2000, m - 1, d));
	t.setUTCFullYear(y);
	return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

function assertInvariant(where: string) {
	const [d, m, y] = segs().map((s) => s.textContent?.trim() ?? '');
	const emitted = hidden().value;
	const invalid = group().getAttribute('aria-invalid') === 'true';
	if (emitted !== '') {
		expect(emitted, `${where}: emitted ${emitted} shown ${d}/${m}/${y}`).toBe(`${y}-${m}-${d}`);
		expect(invalid, `${where}: a valid emitted date is not invalid`).toBe(false);
	} else {
		const complete = /^\d\d$/.test(d!) && /^\d\d$/.test(m!) && /^\d{4}$/.test(y!);
		if (complete) {
			// every complete triple that is not a real, in-range date must be marked invalid; a real one must have been emitted
			const real =
				realDate(Number(d), Number(m), Number(y)) &&
				Number(y) >= 1900 &&
				Number(y) <= new Date().getFullYear() + 10;
			expect(real, `${where}: ${d}/${m}/${y} is a real date but nothing was emitted`).toBe(false);
			if (!real) expect(invalid, `${where}: ${d}/${m}/${y} must be invalid`).toBe(true);
		}
	}
}

const KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const NAV = ['Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

async function run(seed: number, withCalendar: boolean) {
	const r = rng(seed);
	const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)]!;
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Host as never, { target, props: {} as never });
	flushSync();
	segs()[0]!.focus();
	const steps = 6 + Math.floor(r() * 14);
	for (let i = 0; i < steps; i++) {
		const x = r();
		const active = document.activeElement as HTMLElement;
		const onSeg = active?.hasAttribute?.('data-segment');
		let label: string;
		if (x < 0.07) {
			// a value set from outside (a form reset or a loaded record) replaces whatever was typed
			// (an outside value equal to the one already held cannot be seen as a change by any bound field: skipped)
			const set = pick(
				['2025-08-07', '2024-02-29', '1999-12-31', ''].filter((v) => v !== hidden().value)
			);
			target.querySelector<HTMLButtonElement>('[data-testid="set"]')!.dataset.to = set;
			target.querySelector<HTMLButtonElement>('[data-testid="set"]')!.click();
			flushSync();
			label = `outside set ${set}`;
			// what was set is what is shown and emitted
			expect(hidden().value, label).toBe(set);
			expect(
				segs()
					.map((e) => e.textContent?.trim())
					.join('/'),
				label
			).toBe(set ? set.split('-').reverse().join('/') : 'dd/mm/yyyy');
		} else if (withCalendar && x < 0.22) {
			(target.querySelector('button[aria-label^="Open calendar"]') as HTMLButtonElement).click();
			flushSync();
			await vi.waitFor(() => expect(days().length).toBeGreaterThan(27));
			const sub = r();
			if (sub < 0.4) {
				const sel = document.querySelector<HTMLSelectElement>('select[aria-label="Month"]')!;
				sel.value = String(1 + Math.floor(r() * 12));
				sel.dispatchEvent(new Event('change', { bubbles: true }));
				flushSync();
				label = 'calendar month dropdown';
			} else if (sub < 0.6) {
				const sel = document.querySelector<HTMLSelectElement>('select[aria-label="Year"]')!;
				sel.value = String(1990 + Math.floor(r() * 80));
				sel.dispatchEvent(new Event('change', { bubbles: true }));
				flushSync();
				label = 'calendar year dropdown';
			} else {
				const inMonth = days().filter((d) => !d.hasAttribute('data-outside-month'));
				pick(inMonth).click();
				flushSync();
				label = 'calendar pick';
			}
			// a pick closes the popover, except picking the selected day again (the calendar clears it): close it by hand
			await vi
				.waitFor(() => expect(days()).toHaveLength(0), { timeout: 250 })
				.catch(async () => {
					(
						target.querySelector('button[aria-label^="Open calendar"]') as HTMLButtonElement
					).click();
					flushSync();
					await vi.waitFor(() => expect(days()).toHaveLength(0));
				});
			segs()[Math.floor(r() * 3)]!.focus();
		} else if (!onSeg) {
			label = 'refocus';
			segs()[Math.floor(r() * 3)]!.focus();
		} else if (x < 0.7) {
			const k = pick(KEYS);
			label = `digit ${k}`;
			key(active, k);
		} else if (x < 0.92) {
			const k = pick(NAV);
			label = k;
			key(active, k);
		} else {
			label = 'Tab';
			key(active, 'Tab');
			const list = segs();
			const next = list[list.indexOf(active) + 1];
			if (next) next.focus();
			else active.blur();
			flushSync();
		}
		assertInvariant(`seed ${seed} step ${i} (${label})`);
	}
	unmount(component);
	component = undefined;
	target.remove();
}

describe('typed dates: what the field shows is what it emits', () => {
	it('300 random keystroke sequences (digits, Backspace, arrows, Up/Down, Tab)', async () => {
		for (let seed = 1; seed <= 300; seed++) await run(seed, false);
	}, 120_000);

	it('60 random sequences that also drive the calendar (open, month and year dropdowns, picks)', async () => {
		for (let seed = 1001; seed <= 1060; seed++) await run(seed, true);
	}, 240_000);
});
