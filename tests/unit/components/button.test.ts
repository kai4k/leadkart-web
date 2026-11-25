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

	it('variant="tonal" is the soft brand button', () => {
		render({ variant: 'tonal' });
		const cls = target.querySelector('button')!.className;
		expect(cls).toContain('bg-primary-tonal');
		expect(cls).toContain('text-primary-tonal-foreground');
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

describe('Button variants (Pebble World)', () => {
	const classesOf = (props: Record<string, unknown>) => {
		render(props);
		const cls = (target.querySelector('[data-slot="button"]') as HTMLElement).className;
		if (component) unmount(component);
		component = undefined;
		target.remove();
		return cls;
	};
	it('defaults to primary', () => {
		expect(classesOf({})).toBe(classesOf({ variant: 'primary' }));
	});
	it.each([
		['primary', 'bg-primary text-primary-foreground'],
		['secondary', 'material-clay-sm'],
		['ghost', 'text-primary-text'],
		['destructive', 'bg-destructive text-destructive-foreground'],
		['link', 'underline-offset-4']
	])('variant=%s renders its class set', (variant, expected) => {
		const cls = classesOf({ variant });
		for (const c of expected.split(' ')) expect(cls.split(/\s+/)).toContain(c);
	});
	it('the retired variant names are gone', () => {
		for (const variant of ['default', 'outline'])
			expect(classesOf({ variant }), variant).not.toContain('bg-primary ');
	});
	it('the clay variants press with --press-scale and lift, under motion-safe only', () => {
		for (const variant of ['primary', 'tonal', 'secondary', 'destructive']) {
			const parts = classesOf({ variant }).split(/\s+/);
			expect(parts, variant).toContain('motion-safe:active:scale-(--press-scale)');
			expect(parts, variant).toContain('motion-safe:hover:-translate-y-(--lift)');
			expect(
				parts.filter((c) => /^(active|hover):.*(scale|translate)/.test(c)),
				variant
			).toEqual([]);
		}
	});
	it('every size renders a height', () => {
		for (const size of ['sm', 'md', 'lg', 'icon'])
			expect(classesOf({ size }), size).toMatch(/\b(h|size)-\d+/);
	});
	it('the clay variants carry the solid edge so forced colours keeps an outline', () => {
		expect(classesOf({ variant: 'primary' })).toContain('border-(--solid-edge)');
	});
});

describe('Button shape (plan G7, Q1)', () => {
	const classesOf = (props: Record<string, unknown>) => {
		render(props);
		return (target.querySelector('[data-slot="button"]') as HTMLElement).className.split(/\s+/);
	};
	it('every variant but link is a capsule, at every size', () => {
		for (const variant of ['primary', 'destructive', 'secondary', 'ghost', 'tonal'])
			for (const size of ['md', 'sm', 'lg', 'icon', 'icon-sm'] as const) {
				expect(classesOf({ variant, size }), `${variant}/${size}`).toContain('rounded-full');
				expect(classesOf({ variant, size })).not.toContain('rounded-md');
				if (component) unmount(component);
				component = undefined;
				target.remove();
			}
	});
	it('the default size is a capsule and the link variant has no radius class', () => {
		expect(classesOf({})).toContain('rounded-full');
		if (component) unmount(component);
		target.remove();
		const link = classesOf({ variant: 'link' });
		expect(link.filter((c) => c.startsWith('rounded'))).toEqual([]);
	});
});
