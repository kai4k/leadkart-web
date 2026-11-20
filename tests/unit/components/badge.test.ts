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
	it('size="sm" is the compact badge: tighter padding and the 2xs type step', () => {
		render({ variant: 'success', size: 'sm' });
		expect(cls()).toContain('px-1.5');
		expect(cls()).toContain('text-2xs');
		expect(cls()).not.toContain('px-2 ');
		expect(cls()).not.toContain('text-xs');
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
