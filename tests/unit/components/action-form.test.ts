import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import type { ActionResult } from '$app/forms';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

type SubmitInput = { formElement: HTMLFormElement; cancel: () => void };
type After = (o: {
	result: ActionResult;
	update: (o?: { reset?: boolean }) => Promise<void>;
	formElement: HTMLFormElement;
}) => Promise<void>;
type Submit = (input: SubmitInput) => After | void | Promise<After | void>;
type Nav = { cancel: () => void; willUnload: boolean };
const h = vi.hoisted(() => ({
	submit: undefined as Submit | undefined,
	nav: undefined as ((nav: Nav) => void) | undefined
}));
vi.mock('$app/forms', () => ({
	enhance: (_form: HTMLFormElement, submit?: Submit) => {
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

import Host from '../stubs/ActionFormHost.svelte';
import { navigateHard } from '#lib/api/hard-reset.ts';
import { releaseLeaveGuards } from '#lib/hooks/use-leave-guard.svelte.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

async function render(props: Record<string, unknown> = {}) {
	const p = reactiveProps<Record<string, unknown>>(props);
	component = mount(Host, { target, props: p });
	flushSync();
	await tick();
	return p;
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
});

const done = (type: ActionResult['type']) =>
	({ type, status: type === 'failure' ? 422 : 200, data: {} }) as ActionResult;

const submitBtn = () => target.querySelector<HTMLButtonElement>('button[type="submit"]');
const alerts = () => [...target.querySelectorAll<HTMLElement>('[role="alert"]')];
const statuses = () => [...target.querySelectorAll<HTMLElement>('[role="status"]')];

describe('ActionForm: what the action returned', () => {
	it('a failure: one destructive alert with the translated banner key, the field with its translated key', async () => {
		await render({
			result: {
				formErrorKey: 'auth.errors.upstreamUnavailable',
				fieldKeys: { name: 'auth.errors.emailRequired' }
			}
		});
		expect(alerts()).toHaveLength(1);
		expect(alerts()[0]!.textContent).toContain('The service is not reachable right now');
		expect(target.textContent).toContain('Email is required.');
		expect(target.querySelector('[aria-invalid="true"]')).not.toBeNull();
	});

	it('a schema message that is a key reaches the field as catalogue text', async () => {
		await render({ result: { fieldMessages: { name: 'form.errors.reasonRequired' } } });
		expect(target.textContent).toContain('Reason is required.');
	});

	it('an API code reaches the field as catalogue text', async () => {
		await render({ result: { fieldMessages: { name: 'too_long' } } });
		expect(target.textContent).toContain('This is too long.');
	});

	it('the failure values repopulate the field', async () => {
		await render({ result: { values: { name: 'Typed' }, fieldKeys: {} } });
		expect(target.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('Typed');
	});

	it('success: a polite status region (there before its text) with the success line, no alert', async () => {
		const p = await render({ result: null });
		expect(statuses()).toHaveLength(1);
		expect(statuses()[0]!.textContent?.trim()).toBe('');
		p.result = { success: true };
		flushSync();
		expect(statuses()).toHaveLength(1);
		expect(statuses()[0]!.textContent).toContain('Saved.');
		expect(alerts()).toHaveLength(0);
	});

	it('a failure with a banner never also shows the success line', async () => {
		await render({ result: { success: true, formErrorKey: 'auth.errors.forbidden' } });
		expect(target.textContent).not.toContain('Saved.');
		expect(alerts()).toHaveLength(1);
	});
});

describe('ActionForm: the footer', () => {
	it('allowed=false: no submit button, the reason instead', async () => {
		await render({ allowed: false, disallowedReason: 'You cannot change this.' });
		expect(submitBtn()).toBeNull();
		expect(target.textContent).toContain('You cannot change this.');
	});

	it('allowed: a submit button labelled by the caller inside the form footer', async () => {
		await render();
		expect(submitBtn()?.textContent?.trim()).toBe('Save changes');
		expect(submitBtn()!.closest('.form-footer')).not.toBeNull();
	});

	it('scoped carries the context field', async () => {
		await render();
		expect(target.querySelector('input[type="hidden"]')).not.toBeNull();
	});

	it('scoped=false does not', async () => {
		await render({ scoped: false });
		expect(target.querySelector('input[type="hidden"]')).toBeNull();
	});
});

describe('ActionForm: submitting', () => {
	it('shows loading while the request runs, runs update without reset, then onResult; cannot double-submit', async () => {
		const onResult = vi.fn();
		await render({ onResult });
		const form = target.querySelector('form')!;
		const cancel = vi.fn();
		const after = (await h.submit!({ formElement: form, cancel })) as After;
		flushSync();
		expect(cancel).not.toHaveBeenCalled();
		expect(submitBtn()!.getAttribute('aria-busy')).toBe('true');
		expect(target.querySelector('[data-testid="submitting"]')!.textContent).toBe('true');

		const cancel2 = vi.fn();
		await h.submit!({ formElement: form, cancel: cancel2 });
		expect(cancel2).toHaveBeenCalledOnce();

		const update = vi.fn(async () => {});
		const result = done('success');
		await after({ result, update, formElement: form });
		flushSync();
		expect(update).toHaveBeenCalledWith({ reset: false });
		expect(onResult).toHaveBeenCalledWith(result);
		expect(submitBtn()!.getAttribute('aria-busy')).not.toBe('true');
	});

	it('a failed result focuses the first invalid field', async () => {
		const p = await render({ result: null });
		const form = target.querySelector('form')!;
		const after = (await h.submit!({ formElement: form, cancel: vi.fn() })) as After;
		const update = vi.fn(() => {
			p.result = { fieldKeys: { name: 'auth.errors.emailRequired' } };
			flushSync();
			return Promise.resolve();
		});
		await after({ result: done('failure'), update, formElement: form });
		await tick();
		expect(document.activeElement).toBe(target.querySelector('input[name="name"]'));
	});

	it('a submit whose update throws releases the form (it can be sent again)', async () => {
		await render();
		const form = target.querySelector('form')!;
		const after = (await h.submit!({ formElement: form, cancel: vi.fn() })) as After;
		await expect(
			after({
				result: done('error'),
				update: () => Promise.reject(new Error('boom')),
				formElement: form
			})
		).rejects.toThrow('boom');
		flushSync();
		const cancel = vi.fn();
		await h.submit!({ formElement: form, cancel });
		expect(cancel).not.toHaveBeenCalled();
	});
});

describe('ActionForm: the leave guard (never in the way of a security reset or sign-out)', () => {
	const nav = (): Nav => ({ cancel: vi.fn(), willUnload: false });
	const type = (value: string) => {
		const input = target.querySelector<HTMLInputElement>('input[name="name"]')!;
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	};

	afterEach(() => window.dispatchEvent(new Event('pageshow')));

	it('guardLeave: a clean form lets the page go; typed input asks; declining cancels', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		await render({ guardLeave: true });
		const clean = nav();
		h.nav!(clean);
		expect(confirmSpy).not.toHaveBeenCalled();
		type('Changed');
		const dirty = nav();
		h.nav!(dirty);
		expect(confirmSpy).toHaveBeenCalledOnce();
		expect(dirty.cancel).toHaveBeenCalledOnce();
		confirmSpy.mockRestore();
	});

	it('without guardLeave typed input never asks', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		await render();
		type('Changed');
		const n = nav();
		h.nav?.(n);
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it('a hard reset under way: a dirty ActionForm neither asks nor cancels nor prompts', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		await render({ guardLeave: true });
		type('Changed');
		expect(navigateHard('/', 'context')).toBe(true);
		const n = nav();
		h.nav!(n);
		expect(n.cancel).not.toHaveBeenCalled();
		expect(confirmSpy).not.toHaveBeenCalled();
		const unload = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(unload);
		expect(unload.defaultPrevented).toBe(false);
		confirmSpy.mockRestore();
	});

	it('sign-out (releaseLeaveGuards) lets a dirty ActionForm go without a question', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		await render({ guardLeave: true });
		type('Changed');
		releaseLeaveGuards();
		const n = nav();
		h.nav!(n);
		expect(n.cancel).not.toHaveBeenCalled();
		expect(confirmSpy).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it('a result that redirects (the save leaves the page) is not questioned', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		await render({ guardLeave: true });
		type('Changed');
		const form = target.querySelector('form')!;
		const after = (await h.submit!({ formElement: form, cancel: vi.fn() })) as After;
		const n = nav();
		await after({
			result: { type: 'redirect', status: 303, location: '/next' },
			update: () => {
				h.nav!(n);
				return Promise.resolve();
			},
			formElement: form
		});
		expect(confirmSpy).not.toHaveBeenCalled();
		expect(n.cancel).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it('a saved form is clean again (the baseline moves to what was saved)', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const p = await render({ guardLeave: true, result: null });
		type('Changed');
		const form = target.querySelector('form')!;
		const after = (await h.submit!({ formElement: form, cancel: vi.fn() })) as After;
		await after({
			result: done('success'),
			update: () => {
				p.result = { success: true };
				flushSync();
				return Promise.resolve();
			},
			formElement: form
		});
		await tick();
		h.nav!(nav());
		expect(confirmSpy).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});
});
