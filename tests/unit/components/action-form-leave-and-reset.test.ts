import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import type { ActionResult } from '$app/forms';

type After = (o: {
	result: ActionResult;
	update: (o?: { reset?: boolean }) => Promise<void>;
	formElement: HTMLFormElement;
}) => Promise<void>;
type Nav = { cancel: () => void; willUnload: boolean; type: string; to: null };
const h = vi.hoisted(() => ({
	submit: undefined as
		| ((i: { formElement: HTMLFormElement; cancel: () => void }) => unknown)
		| undefined,
	nav: undefined as ((nav: Nav) => void) | undefined
}));
vi.mock('$app/forms', () => ({
	enhance: (_f: HTMLFormElement, submit?: typeof h.submit) => {
		h.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/navigation', () => ({
	goto: async () => {},
	invalidate: async () => {},
	beforeNavigate: (cb: (nav: Nav) => void) => {
		h.nav = cb;
	}
}));
vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp' }, form: null } }));

import Host from '../stubs/ActionFormPasswordHost.svelte';
import { releaseLeaveGuards } from '#lib/hooks/use-leave-guard.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

async function render(props: Record<string, unknown> = {}) {
	component = mount(Host, { target, props });
	flushSync();
	await tick();
}
beforeEach(() => {
	h.submit = undefined;
	h.nav = undefined;
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	releaseLeaveGuards(false);
	vi.restoreAllMocks();
});

const input = (name: string) => target.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const typeInto = (name: string, value: string) => {
	const el = input(name);
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const toggles = () => [...target.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
const unloadListeners = (spy: { mock: { calls: unknown[][] } }) =>
	spy.mock.calls.filter((call) => call[0] === 'beforeunload').length;

describe('ActionForm: beforeunload exists only while the form is dirty', () => {
	it('registered when input is typed, removed when it is typed back', async () => {
		const add = vi.spyOn(window, 'addEventListener');
		const remove = vi.spyOn(window, 'removeEventListener');
		await render({ guardLeave: true });
		expect(unloadListeners(add), 'a clean form registers none').toBe(0);

		typeInto('name', 'Changed');
		await tick();
		expect(unloadListeners(add)).toBe(1);
		const event = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);

		typeInto('name', 'Asha');
		await tick();
		expect(unloadListeners(remove), 'clean again: the listener is removed').toBe(1);
		const after = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(after);
		expect(after.defaultPrevented).toBe(false);
	});
});

describe('ActionForm: allowed === false', () => {
	it('every control is disabled and the leave guard never asks', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const add = vi.spyOn(window, 'addEventListener');
		await render({ guardLeave: true, allowed: false });
		for (const el of target.querySelectorAll<HTMLInputElement>('input[name]')) {
			expect(el.matches(':disabled'), el.name).toBe(true);
		}
		expect(target.querySelector('button[type="submit"]')).toBeNull();
		const n = { cancel: vi.fn(), willUnload: false, type: 'link', to: null };
		h.nav!(n);
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
		expect(unloadListeners(add)).toBe(0);
	});
});

describe('ActionForm: resetOnSuccess clears a password form', () => {
	it('every password input is emptied and every show-password toggle is hidden again', async () => {
		await render({ resetOnSuccess: true });
		typeInto('current_password', 'Old-password-1!');
		typeInto('new_password', 'New-password-1!');
		for (const t of toggles()) t.click();
		flushSync();
		expect(input('current_password').type).toBe('text');
		expect(input('new_password').type).toBe('text');

		const form = target.querySelector('form')!;
		const after = (await h.submit!({ formElement: form, cancel: vi.fn() })) as After;
		await after({
			result: { type: 'success', status: 200, data: {} } as ActionResult,
			update: async () => {},
			formElement: form
		});
		flushSync();
		await tick();

		expect(input('current_password').value).toBe('');
		expect(input('new_password').value).toBe('');
		expect(input('current_password').type).toBe('password');
		expect(input('new_password').type).toBe('password');
		expect(toggles().every((t) => t.getAttribute('aria-pressed') === 'false')).toBe(true);
	});

	it('a failed result leaves what was typed and the toggle as the person set it', async () => {
		await render({ resetOnSuccess: true });
		typeInto('new_password', 'New-password-1!');
		toggles()[1].click();
		flushSync();
		const form = target.querySelector('form')!;
		const after = (await h.submit!({ formElement: form, cancel: vi.fn() })) as After;
		await after({
			result: { type: 'failure', status: 422, data: {} } as ActionResult,
			update: async () => {},
			formElement: form
		});
		flushSync();
		expect(input('new_password').value).toBe('New-password-1!');
		expect(input('new_password').type).toBe('text');
	});
});

describe('ActionForm: a form that becomes editable while mounted (M-1, M-4)', () => {
	it('is not dirty before anyone typed: the baseline is taken again when `allowed` changes', async () => {
		const { reactiveProps } = await import('../helpers/reactive-props.svelte.ts');
		const props = reactiveProps<{ guardLeave: boolean; allowed: boolean }>({
			guardLeave: true,
			allowed: false
		});
		component = mount(Host, { target, props });
		flushSync();
		await tick();
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		props.allowed = true;
		flushSync();
		await tick();
		await tick();
		const n = { cancel: vi.fn(), willUnload: false, type: 'link', to: null };
		h.nav!(n);
		expect(confirmSpy, 'nothing typed: nothing to lose').not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
		// and typing after that is still caught
		typeInto('name', 'Changed');
		await tick();
		h.nav!(n);
		expect(confirmSpy).toHaveBeenCalledTimes(1);
	});

	it('the read-only reason is tied to the fieldset by aria-describedby', async () => {
		await render({ allowed: false });
		const fieldset = target.querySelector('fieldset')!;
		const reason = target.querySelector('#pw-readonly');
		expect(reason?.textContent).toBe('No access.');
		expect(fieldset.getAttribute('aria-describedby')).toBe('pw-readonly');
	});

	it('an editable form has no such link', async () => {
		await render({ allowed: true });
		expect(target.querySelector('fieldset')!.hasAttribute('aria-describedby')).toBe(false);
	});
});
