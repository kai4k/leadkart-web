import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { Alert } from '#lib/components/ui/alert/index.ts';
import * as Card from '#lib/components/ui/card/index.ts';
import EmptyState from '#lib/components/ui/EmptyState.svelte';
import StatCard from '#lib/components/ui/StatCard.svelte';
import { skeletonVariants } from '#lib/components/ui/skeleton/index.ts';
import DialogHost from '../stubs/DialogHost.svelte';
import CommandHost from '../stubs/CommandHost.svelte';

/** Task 7: containers are solid (clay, sheet, tray); overlays are milk (no blur); only the command palette is glass. */

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const body = createRawSnippet(() => ({ render: () => '<span>Stock is low</span>' }));

function render(Component: unknown, props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Component as never, { target, props });
	flushSync();
}
// bits-ui's command list scrolls the highlighted item into view; jsdom has no layout to do it with.
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const card = () => target.querySelector('[data-slot="card"]')!;

describe('Card', () => {
	it('is clay by default', () => {
		render(Card.Root, { children: body });
		expect(card().classList.contains('material-clay')).toBe(true);
	});
	it.each([
		['clay', 'material-clay'],
		['sheet', 'material-sheet'],
		['tray', 'material-tray']
	])('surface=%s is %s and only that material', (surface, material) => {
		render(Card.Root, { surface, children: body });
		const materials = [...card().classList].filter((c) => c.startsWith('material-'));
		expect(materials).toEqual([material]);
	});
	it('keeps the card radius token and no ring or elevation shadow of its own', () => {
		render(Card.Root, { children: body });
		const classes = [...card().classList];
		expect(classes).toContain('rounded-card');
		expect(classes.some((c) => c === 'ring-1' || c.startsWith('shadow-'))).toBe(false);
	});
});

describe('StatCard (the KPI tile)', () => {
	it('renders its time frame and comparison', () => {
		render(StatCard, {
			label: 'Sales',
			value: '18.4L',
			timeframe: 'This month',
			comparison: 'vs last month'
		});
		expect(target.textContent).toContain('This month');
		expect(target.textContent).toContain('vs last month');
		expect(target.querySelector('[data-slot="card"]')!.classList.contains('material-clay')).toBe(
			true
		);
	});
	it('puts the time frame in the same description list as the value', () => {
		render(StatCard, { label: 'Sales', value: 7, timeframe: 'Today' });
		expect(target.querySelector('dl')!.textContent).toContain('Today');
	});
});

describe('Alert tray (the StatusTray)', () => {
	it.each([
		['warning', 'Needs attention', 'alert'],
		['danger', 'At risk', 'alert'],
		['info', 'Note', 'status'],
		['neutral', 'Status', 'status']
	])('tone=%s is a tinted tray that says %s in words', (tone, word, role) => {
		render(Alert, { variant: 'tray', tone, children: body });
		const alert = target.querySelector('[data-slot="alert"]')!;
		expect(alert.classList.contains('material-tray')).toBe(true);
		expect(alert.getAttribute('data-tone')).toBe(tone);
		expect(alert.getAttribute('role')).toBe(role);
		expect(alert.querySelector('[data-slot="alert-tone"]')?.textContent?.trim()).toBe(word);
		expect(alert.textContent).toContain('Stock is low');
	});
	it('a neutral tray is untinted, the others carry their status tint', () => {
		render(Alert, { variant: 'tray', tone: 'warning', children: body });
		expect(target.querySelector('[data-slot="alert"]')!.className).toContain('--warning-soft');
	});
});

describe('Skeleton and EmptyState', () => {
	it('the skeleton is a tray block, not a muted fill', () => {
		const cls = skeletonVariants({});
		expect(cls).toContain('bg-tray');
		expect(cls).not.toContain('bg-muted');
	});
	it('the empty state is an icon on a tray chip and a caption, with no card around it', () => {
		render(EmptyState, { title: 'Nothing here', description: 'Add one.' });
		expect(target.querySelector('[class*="material-"], [data-slot="card"]')).toBeNull();
		expect(target.textContent).toContain('Nothing here');
	});
});

describe('overlays', () => {
	it('a dialog is milk and never blurs', () => {
		render(DialogHost, { open: true });
		const content = document.querySelector('[data-slot="dialog-content"]')!;
		expect(content.classList.contains('material-milk')).toBe(true);
		const classes = [...content.classList];
		expect(classes.some((c) => /backdrop|material-(glass|bar|sidebar)/.test(c))).toBe(false);
	});
	it('the command palette is the glass overlay', () => {
		render(CommandHost, { open: true });
		const content = document.querySelector('[data-slot="dialog-content"]')!;
		const materials = [...content.classList].filter((c) => c.startsWith('material-'));
		expect(materials).toEqual(['material-glass']);
	});
});
