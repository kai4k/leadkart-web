import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Switch from '#lib/components/form/Switch.svelte';

let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
});

/**
 * M-3: a switch inside a disabled `<fieldset>` is `:disabled` but bits-ui sets no `data-disabled` on it, so the
 * look has to come from the `disabled:` variant.
 */
describe('a disabled switch looks disabled', () => {
	it('carries the :disabled variants, not only data-disabled', () => {
		const target = document.body.appendChild(document.createElement('fieldset'));
		target.disabled = true;
		component = mount(Switch, { target, props: { label: 'Require digit', name: 'd' } });
		flushSync();
		const button = target.querySelector<HTMLButtonElement>('button[role="switch"]')!;
		expect(button.matches(':disabled')).toBe(true);
		expect(button.className).toContain('disabled:opacity-50');
		expect(button.className).toContain('disabled:cursor-not-allowed');
	});
});
