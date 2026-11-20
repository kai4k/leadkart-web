/**
 * Every form that posts to a scope-sensitive server action carries the tenant-context fingerprint of
 * the page it was rendered in, as a hidden field (so it also works without JavaScript). When the
 * action refuses because the context changed meanwhile (or the scope cookie died), the page does a
 * hard reset through the one foreign-change function: re-running the layout in place would re-bind
 * the typed values to the new context.
 */
import { flushSync, mount, tick, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	page: { data: { scopeContext: 'fp-a' } as Record<string, unknown>, form: null as unknown }
}));
vi.mock('$app/state', () => state);
const refresh = vi.hoisted(() => vi.fn(() => true));
vi.mock('#lib/api/operator-scope.ts', () => ({ scopeChangedElsewhere: refresh }));

import ScopeContextField from '#lib/components/form/ScopeContextField.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const render = async (C: typeof ScopeContextField) => {
	component = mount(C, { target });
	flushSync();
	await tick();
	return { container: target };
};
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

beforeEach(() => {
	target = document.body.appendChild(document.createElement('div'));
	vi.clearAllMocks();
	state.page.data = { scopeContext: 'fp-a' };
	state.page.form = null;
});

describe('ScopeContextField', () => {
	it("is a hidden field named scope_context holding the page's fingerprint", async () => {
		const { container } = await render(ScopeContextField);
		const input = container.querySelector('input[type="hidden"][name="scope_context"]');
		expect(input).not.toBeNull();
		expect((input as HTMLInputElement).value).toBe('fp-a');
	});

	it('is empty (and so refused by the action) when the page carries no fingerprint', async () => {
		state.page.data = {};
		const { container } = await render(ScopeContextField);
		expect((container.querySelector('input[name="scope_context"]') as HTMLInputElement).value).toBe(
			''
		);
	});

	it('hands the change to the foreign-change path when the action said the context changed', async () => {
		state.page.form = { formErrorKey: 'auth.errors.scopeChanged' };
		await render(ScopeContextField);
		await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
		expect(refresh).toHaveBeenCalledWith(undefined, 'refusal');
	});

	it('does the same when the action said the scope cookie is dead', async () => {
		state.page.form = { formErrorKey: 'errors.code.scope_invalid' };
		await render(ScopeContextField);
		await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
	});

	it('does nothing for any other failure or no failure', async () => {
		state.page.form = { formErrorKey: 'auth.errors.forbidden' };
		await render(ScopeContextField);
		expect(refresh).not.toHaveBeenCalled();
	});
});
