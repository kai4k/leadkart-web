import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { Button } from '#lib/components/ui/button/index.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const label = createRawSnippet(() => ({ render: () => '<span>Go</span>' }));

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Button as never, { target, props: { children: label, ...props } });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

describe('Button', () => {
	it('renders a link for href, with no nested button', () => {
		render({ href: '/leads' });
		const a = target.querySelector('a[data-slot="button"]');
		expect(a?.getAttribute('href')).toBe('/leads');
		expect(target.querySelector('button')).toBeNull();
	});

	it('a disabled link is not a live link', () => {
		render({ href: '/leads', disabled: true });
		const a = target.querySelector('a')!;
		expect(a.getAttribute('href')).toBeNull();
		expect(a.getAttribute('aria-disabled')).toBe('true');
	});

	it('loading sets aria-busy, disables the button and shows the spinner', () => {
		render({ loading: true });
		const b = target.querySelector('button')!;
		expect(b.getAttribute('aria-busy')).toBe('true');
		expect(b.disabled).toBe(true);
		expect(b.querySelector('svg, [role="status"]')).not.toBeNull();
	});

	it('focusableWhileLoading keeps the button in the tab order and ignores clicks', () => {
		const onclick = vi.fn();
		render({ loading: true, focusableWhileLoading: true, onclick });
		const b = target.querySelector('button')!;
		expect(b.disabled).toBe(false);
		expect(b.getAttribute('aria-disabled')).toBe('true');
		b.click();
		expect(onclick).not.toHaveBeenCalled();
	});

	it('is type=button by default and forwards a click when idle', () => {
		const onclick = vi.fn();
		render({ onclick });
		const b = target.querySelector('button')!;
		expect(b.type).toBe('button');
		b.click();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('variant="tonal" adds the tonal classes', () => {
		render({ variant: 'tonal' });
		expect(target.querySelector('button')!.className).toContain('bg-muted');
		expect(target.querySelector('button')!.className).toContain('border-border');
	});

	it('uses the opaque hover token, never an alpha', () => {
		render({});
		const cls = target.querySelector('button')!.className;
		expect(cls).toContain('hover:bg-primary-hover');
		expect(cls).not.toMatch(/-[a-z]+\/\d/);
	});

	it('variant="destructive" is a solid fill with an opaque hover', () => {
		render({ variant: 'destructive' });
		const cls = target.querySelector('button')!.className;
		expect(cls).toContain('bg-destructive');
		expect(cls).toContain('hover:bg-destructive-hover');
	});
});
