import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import StatCard from '#lib/components/ui/StatCard.svelte';
import { Coins } from '#lib/icons/index.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(StatCard as never, { target, props });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('StatCard', () => {
	it('announces the value together with its label (a term and its description)', () => {
		render({ label: 'Tenants active', value: 42 });
		const dl = target.querySelector('dl');
		expect(dl).not.toBeNull();
		const dt = dl?.querySelector('dt');
		const dd = dl?.querySelector('dd');
		expect(text(dt ?? null)).toBe('Tenants active');
		expect(text(dd ?? null)).toBe('42');
		// The label comes first in reading order.
		expect(dt?.compareDocumentPosition(dd as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it('keeps a hint as a further description of the same term', () => {
		render({ label: 'Lead credits', value: 7, hint: 'Available for purchases' });
		expect(text(target.querySelector('dl'))).toContain('Available for purchases');
		expect(target.querySelectorAll('dl > dt').length).toBe(1);
	});

	it('shows a skeleton and marks itself busy while loading, with no value', () => {
		render({ label: 'Tenants active', value: 42, loading: true });
		const root = target.querySelector('[aria-busy="true"]');
		expect(root).not.toBeNull();
		expect(root?.querySelector('[data-slot="skeleton"]')).not.toBeNull();
		expect(text(root)).not.toContain('42');
		expect(text(root)).toContain('Tenants active');
	});

	it('is not busy once loaded', () => {
		render({ label: 'Tenants active', value: 42 });
		expect(target.querySelector('[aria-busy="true"]')).toBeNull();
		expect(target.querySelector('[data-slot="skeleton"]')).toBeNull();
	});

	it('renders a positive delta with its sign, the period and an up trend', () => {
		render({ label: 'MRR', value: 10, delta: { value: 12.5, period: 'vs last week' } });
		const delta = target.querySelector('[data-trend]');
		expect(delta?.getAttribute('data-trend')).toBe('up');
		expect(text(delta)).toContain('+12.5%');
		expect(text(delta)).toContain('vs last week');
		// Direction is words as well as colour and arrow.
		expect(delta?.querySelector('.sr-only')?.textContent?.length).toBeGreaterThan(0);
	});

	it('renders a negative delta with its sign and a down trend', () => {
		render({ label: 'MRR', value: 10, delta: { value: -3, period: 'vs last week' } });
		const delta = target.querySelector('[data-trend]');
		expect(delta?.getAttribute('data-trend')).toBe('down');
		expect(text(delta)).toContain('-3.0%');
	});

	it('renders a zero delta as flat', () => {
		render({ label: 'MRR', value: 10, delta: { value: 0, period: 'vs last week' } });
		const delta = target.querySelector('[data-trend]');
		expect(delta?.getAttribute('data-trend')).toBe('flat');
		expect(text(delta)).toContain('0.0%');
	});

	it('hides the delta while loading', () => {
		render({ label: 'MRR', value: 10, loading: true, delta: { value: 1, period: 'p' } });
		expect(target.querySelector('[data-trend]')).toBeNull();
	});

	it('draws the icon chip in the requested accent and hides it from assistive technology', () => {
		render({ label: 'Lead credits', value: 7, icon: Coins, accent: 'success' });
		const chip = target.querySelector('[data-accent]');
		expect(chip?.getAttribute('data-accent')).toBe('success');
		expect(chip?.getAttribute('aria-hidden')).toBe('true');
		expect(chip?.querySelector('svg')).not.toBeNull();
	});

	it('has no icon chip without an icon', () => {
		render({ label: 'Lead credits', value: 7 });
		expect(target.querySelector('[data-accent]')).toBeNull();
	});

	it('reads an em dash value as "no data yet"', () => {
		render({ label: 'Open orders', value: '—' });
		const dd = target.querySelector('dd');
		expect(dd?.querySelector('.sr-only')?.textContent).toBe('No data yet');
	});
});
