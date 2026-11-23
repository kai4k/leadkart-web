import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

type SubmitInput = { formElement: HTMLFormElement; cancel: () => void };
const h = vi.hoisted(() => ({
	submit: undefined as ((input: SubmitInput) => unknown) | undefined
}));
vi.mock('$app/forms', () => ({
	enhance: (_form: HTMLFormElement, submit?: (input: SubmitInput) => unknown) => {
		h.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/navigation', () => ({
	goto: async () => {},
	invalidate: async () => {},
	beforeNavigate: () => {}
}));
vi.mock('$app/state', () => ({ page: { data: { scopeContext: 'fp' }, form: null } }));

import SurfaceHost from '../stubs/FormSurfaceHost.svelte';
import ActionNumberHost from '../stubs/ActionNumberHost.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	h.submit = undefined;
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const typeInto = (el: HTMLInputElement, text: string) => {
	el.value = text;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
};
const leave = (el: HTMLInputElement) => {
	el.focus();
	el.blur();
	flushSync();
};

describe('validateOn="blur" in FormSurfaceForm', () => {
	const mountSurface = (validateOn: 'submit' | 'blur') => {
		component = mount(SurfaceHost, {
			target,
			props: { seed: '', onSubmit: async () => {}, onOpenChange: () => {}, validateOn }
		});
		flushSync();
	};
	const name = () => document.querySelector<HTMLInputElement>('input[name="name"]')!;
	const submit = () => {
		document.querySelector<HTMLFormElement>('#host-form')!.requestSubmit();
		flushSync();
	};
	const fieldError = () => document.querySelector('[data-slot="field-error"]')?.textContent?.trim();

	it('the message goes the moment the text passes, and comes back when the field is left empty again', () => {
		mountSurface('blur');
		submit();
		expect(fieldError()).toBe('This field is required.');
		typeInto(name(), 'Asha');
		expect(fieldError()).toBeUndefined();
		typeInto(name(), '');
		// typing alone never adds a message
		expect(fieldError()).toBeUndefined();
		leave(name());
		expect(fieldError()).toBe('This field is required.');
	});

	it('before the first submit a blur is silent (nobody is ambushed by an untouched field)', () => {
		mountSurface('blur');
		leave(name());
		expect(fieldError()).toBeUndefined();
	});

	it('without validateOn="blur" the message stays until the next submit (unchanged behaviour)', () => {
		mountSurface('submit');
		submit();
		typeInto(name(), 'Asha');
		leave(name());
		expect(fieldError()).toBe('This field is required.');
	});
});

describe('ActionForm', () => {
	const mountAction = (result?: unknown) => {
		component = mount(ActionNumberHost, { target, props: { result: result as never } });
		flushSync();
	};
	const level = () => target.querySelector<HTMLInputElement>('input[name="level"]')!;
	const nameInput = () => target.querySelector<HTMLInputElement>('input[name="name"]')!;
	const runSubmit = () => {
		const cancel = vi.fn();
		h.submit?.({ formElement: target.querySelector('form')!, cancel });
		return cancel;
	};

	it('cancels the submit and focuses the field while a number is unreadable (novalidate hid it)', async () => {
		mountAction();
		await tick();
		level().focus();
		typeInto(level(), 'abc');
		level().blur();
		flushSync();
		expect(level().getAttribute('data-unreadable')).toBe('true');
		const cancel = runSubmit();
		await tick();
		expect(cancel).toHaveBeenCalled();
		expect(document.activeElement).toBe(level());
	});

	it('cancels the submit while a number is out of range (200 is no longer clamped to 99 and sent)', () => {
		mountAction();
		level().focus();
		typeInto(level(), '200');
		level().blur();
		flushSync();
		expect(level().value).toBe('200');
		expect(runSubmit()).toHaveBeenCalled();
	});

	it('lets a readable number through', () => {
		mountAction();
		level().focus();
		typeInto(level(), '40');
		level().blur();
		flushSync();
		expect(runSubmit()).not.toHaveBeenCalled();
	});

	it('a server message about a field goes once the field is edited', () => {
		mountAction({ fieldMessages: { name: 'too_long' } });
		expect(target.textContent).toContain('This is too long.');
		typeInto(nameInput(), 'Asha K');
		expect(target.textContent).not.toContain('This is too long.');
		expect(nameInput().getAttribute('aria-invalid')).toBeNull();
	});
});
