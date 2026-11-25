import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import StatusPill from '#lib/components/ui/StatusPill.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(StatusPill as never, { target, props });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

describe('StatusPill', () => {
	it('static pill: status tint, the word and a decorative glyph', () => {
		render({ value: 'active' });
		const badge = target.querySelector('[data-slot="badge"]')!;
		expect(badge.className).toContain('bg-success-soft');
		expect(badge.textContent?.trim()).toBe('active');
		const glyph = badge.querySelector('[data-slot="status-glyph"]')!;
		expect(glyph.getAttribute('aria-hidden')).toBe('true');
	});
	it.each([
		['active', 'success'],
		['pending', 'warning'],
		['failed', 'danger'],
		['new', 'info']
	])('%s draws the %s shape (an icon), not the plain dot', (value, glyph) => {
		render({ value });
		const g = target.querySelector('[data-slot="status-glyph"]')!;
		expect(g.getAttribute('data-glyph')).toBe(glyph);
		expect(g.querySelector('svg')).not.toBeNull();
	});
	it('the four shapes differ, and a neutral status keeps the dot', () => {
		const shapes = ['active', 'pending', 'failed', 'new'].map((value) => {
			render({ value });
			const html = target.querySelector('[data-slot="status-glyph"] svg')!.innerHTML;
			unmount(component!);
			component = undefined;
			target.remove();
			return html;
		});
		expect(new Set(shapes).size).toBe(4);
		render({ value: 'archived' });
		const g = target.querySelector('[data-slot="status-glyph"]')!;
		expect(g.getAttribute('data-glyph')).toBe('dot');
		expect(g.querySelector('svg')).toBeNull();
	});
	it('an unknown status is neutral and still carries its word', () => {
		render({ value: 'weird' });
		const badge = target.querySelector('[data-slot="badge"]')!;
		expect(badge.className).toContain('bg-muted');
		expect(badge.textContent?.trim()).toBe('weird');
	});
	it('no pill text is under 12px', () => {
		render({ value: 'pending' });
		expect(target.innerHTML).not.toContain('text-2xs');
	});
});
