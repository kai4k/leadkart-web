import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { Badge } from '#lib/components/ui/badge/index.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const text = createRawSnippet(() => ({ render: () => '<span>Active</span>' }));

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Badge as never, { target, props: { children: text, ...props } });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const cls = () => target.querySelector('[data-slot="badge"]')!.className;

describe('Badge', () => {
	it('variant="success" is the soft success fill', () => {
		render({ variant: 'success' });
		expect(cls()).toContain('bg-success-soft');
		expect(cls()).toContain('text-success');
	});
	it.each([
		['info', 'bg-info-soft'],
		['warning', 'bg-warning-soft'],
		['danger', 'bg-destructive-soft'],
		['brand', 'bg-primary-soft'],
		['neutral', 'bg-muted']
	])('variant=%s uses %s', (variant, expected) => {
		render({ variant });
		expect(cls()).toContain(expected);
	});
	it('keeps the shadcn variants', () => {
		render({ variant: 'outline' });
		expect(cls()).toContain('border-border');
	});
	it('size="sm" is the compact badge: tighter padding, never under the 12px type floor', () => {
		render({ variant: 'success', size: 'sm' });
		expect(cls()).toContain('px-1.5');
		expect(cls()).toContain('text-xs');
		expect(cls()).not.toContain('text-2xs');
		expect(cls()).not.toContain('px-2 ');
	});
	it('variant="count" is the neutral count: card fill, readable text, no status colour', () => {
		render({ variant: 'count', label: '12 unread' });
		expect(cls()).toContain('bg-badge-count');
		expect(cls()).toContain('text-badge-count-foreground');
		expect(cls()).not.toMatch(/destructive|success|warning|info/);
	});
	it('a count is named for screen readers: the label is read, the bare number is hidden', () => {
		render({ variant: 'count', label: '12 unread' });
		const el = target.querySelector('[data-slot="badge"]')!;
		expect(el.querySelector('.sr-only')?.textContent).toBe('12 unread');
		expect(el.querySelector('[aria-hidden="true"]')?.textContent).toBe('Active');
		expect(el.querySelector('svg')).toBeNull();
	});
	it('variant="count-urgent" uses the danger tokens, a glyph and a word: colour is not the only cue', () => {
		render({ variant: 'count-urgent', label: '3 overdue' });
		expect(cls()).toContain('bg-destructive');
		expect(cls()).toContain('text-destructive-foreground');
		const el = target.querySelector('[data-slot="badge"]')!;
		expect(el.querySelector('svg')).not.toBeNull();
		expect(el.querySelector('.sr-only')?.textContent).toBe('3 overdue');
	});
	it('an urgent count with no label still says urgent in words', () => {
		render({ variant: 'count-urgent' });
		expect(target.querySelector('.sr-only')?.textContent).toBe('urgent');
	});
	it('the two counts share one base: they differ only in fill and ink', () => {
		render({ variant: 'count' });
		const a = cls()
			.split(/\s+/)
			.filter((c) => !/badge-count|^bg-|^text-/.test(c));
		unmount(component!);
		component = undefined;
		target.remove();
		render({ variant: 'count-urgent' });
		const b = cls()
			.split(/\s+/)
			.filter((c) => !/destructive/.test(c) && !/^bg-|^text-/.test(c));
		expect(a.sort()).toEqual(b.sort());
	});
	it('the default size keeps the regular padding and text-xs', () => {
		render({ variant: 'success' });
		expect(cls()).toContain('px-2');
		expect(cls()).toContain('text-xs');
	});
	it('renders a link for href', () => {
		render({ href: '/x' });
		expect(target.querySelector('a[data-slot="badge"]')).not.toBeNull();
	});
});
