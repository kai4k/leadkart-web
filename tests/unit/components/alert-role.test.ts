import { afterEach, describe, expect, it } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { Alert } from '#lib/components/ui/alert/index.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const body = createRawSnippet(() => ({ render: () => '<span>Something happened</span>' }));

function render(props: Record<string, unknown>) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(Alert as never, { target, props: { children: body, ...props } });
	flushSync();
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const root = () => target.querySelector('[data-slot="alert"]')!;

describe('Alert role', () => {
	it.each([
		['destructive', 'alert'],
		['warning', 'alert'],
		['info', 'status'],
		['success', 'status'],
		['default', 'status']
	])('variant=%s is role=%s', (variant, expected) => {
		render({ variant });
		expect(root().getAttribute('role')).toBe(expected);
	});
	it('a caller that renders its own live region first can drop the Alert role (role="none")', () => {
		render({ variant: 'success', role: 'none' });
		expect(root().getAttribute('role')).toBe('none');
	});
	it('a title renders and the dismiss button calls back', () => {
		let dismissed = 0;
		render({ variant: 'info', title: 'Heads up', dismissible: true, onDismiss: () => dismissed++ });
		expect(target.textContent).toContain('Heads up');
		target.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!.click();
		expect(dismissed).toBe(1);
	});
	it('uses soft token fills with no alpha', () => {
		render({ variant: 'warning' });
		expect(root().className).toContain('bg-warning-soft');
		expect(root().className).not.toMatch(/-[a-z]+\/\d/);
	});
});
