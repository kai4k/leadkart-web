/**
 * Unit tests for the useForm hook (Form class).
 * Covers the client-side Zod validation path, error surface,
 * bannerError on unexpected throws, and ValidationError field mapping.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { formInRoot } from '../helpers/form-root.svelte.ts';
import { NetworkError, ValidationError } from '#lib/api/errors.ts';

const testSchema = z.object({
	email: z.string().email('Invalid email'),
	name: z.string().min(2, 'Name too short')
});

function makeEvent(): SubmitEvent {
	return { preventDefault: vi.fn() } as unknown as SubmitEvent;
}

describe('useForm factory', () => {
	it('returns a Form instance', () => {
		const form = formInRoot(testSchema, { email: '', name: '' }).form;
		expect(typeof form.submit).toBe('function');
	});

	it('initialises values from the initial argument', () => {
		const form = formInRoot(testSchema, { email: 'a@b.com', name: 'Alice' }).form;
		expect(form.values.email).toBe('a@b.com');
		expect(form.values.name).toBe('Alice');
	});
});

describe('Form.submit — client-side Zod validation', () => {
	it('sets field errors and does NOT call submitFn when validation fails', async () => {
		const form = formInRoot(testSchema, { email: 'not-an-email', name: 'x' }).form;
		const submitFn = vi.fn();

		await form.submit(makeEvent(), submitFn);

		expect(submitFn).not.toHaveBeenCalled();
		expect(form.errors.email).toBe('Invalid email');
		expect(form.errors.name).toBe('Name too short');
		expect(form.isSubmitting).toBe(false);
	});

	it('calls submitFn with parsed output when values are valid', async () => {
		const form = formInRoot(testSchema, { email: 'alice@example.com', name: 'Alice' }).form;
		const submitFn = vi.fn().mockResolvedValue(undefined);

		await form.submit(makeEvent(), submitFn);

		expect(submitFn).toHaveBeenCalledWith(
			{ email: 'alice@example.com', name: 'Alice' },
			expect.any(Function)
		);
		expect(form.errors).toEqual({});
		expect(form.bannerError).toBeNull();
		expect(form.isSubmitting).toBe(false);
	});
});

describe('Form.submit — error handling', () => {
	it('maps ValidationError.fields to form.errors', async () => {
		const form = formInRoot(testSchema, { email: 'alice@example.com', name: 'Alice' }).form;
		const ve = new ValidationError({ email: 'Already taken' }, 422);
		const submitFn = vi.fn().mockRejectedValue(ve);

		await form.submit(makeEvent(), submitFn);

		expect(form.errors.email).toBe('Already taken');
		expect(form.bannerError).toBeNull();
	});

	it('sets bannerError from ApiError subclass message (e.g. NetworkError)', async () => {
		const form = formInRoot(testSchema, { email: 'alice@example.com', name: 'Alice' }).form;
		const submitFn = vi.fn().mockRejectedValue(new NetworkError(new Error('socket reset')));

		await form.submit(makeEvent(), submitFn);

		// ApiError's typed `.message` accessor is canon-legal — see use-form.svelte.ts
		// catch-block comment. Bare `new Error(...)` surfaces a generic banner instead.
		expect(form.bannerError).not.toBeNull();
		expect(form.errors).toEqual({});
	});

	it('sets bannerError to generic message for bare Error throws (programmer error)', async () => {
		const form = formInRoot(testSchema, { email: 'alice@example.com', name: 'Alice' }).form;
		const submitFn = vi.fn().mockRejectedValue(new Error('Network error'));

		await form.submit(makeEvent(), submitFn);

		// Raw new Error() in a submit handler is a programmer error — should
		// not surface its raw message to users (canon: typed ApiError or generic).
		expect(form.bannerError).toBe('An unexpected error occurred');
		expect(form.errors).toEqual({});
	});

	it('sets bannerError to generic message for non-Error throws', async () => {
		const form = formInRoot(testSchema, { email: 'alice@example.com', name: 'Alice' }).form;
		const submitFn = vi.fn().mockRejectedValue('string error');

		await form.submit(makeEvent(), submitFn);

		expect(form.bannerError).toBe('An unexpected error occurred');
	});
});

describe('Form.reset', () => {
	it('restores initial values and clears errors/bannerError', () => {
		const form = formInRoot(testSchema, { email: '', name: '' }).form;
		form.values.email = 'alice@example.com';
		form.values.name = 'Alice';
		form.errors = { email: 'some error' };
		form.bannerError = 'oops';

		form.reset();

		expect(form.values.email).toBe('');
		expect(form.values.name).toBe('');
		expect(form.errors).toEqual({});
		expect(form.bannerError).toBeNull();
	});
});

describe('Form.clearErrors', () => {
	it('clears field errors and bannerError without touching values', () => {
		const form = formInRoot(testSchema, { email: '', name: '' }).form;
		form.values.email = 'alice@example.com';
		form.errors = { name: 'too short' };
		form.bannerError = 'server error';

		form.clearErrors();

		expect(form.values.email).toBe('alice@example.com');
		expect(form.errors).toEqual({});
		expect(form.bannerError).toBeNull();
	});
});

describe('Form.validateField — blur validation', () => {
	it('is a no-op when validateOn is not blur', () => {
		const form = formInRoot(testSchema, { email: 'bad', name: 'x' }).form;
		// submitAttempted defaults false; even if we set it, without validateOn blur it no-ops
		form.submitAttempted = true;
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('is a no-op before first submit attempt even with validateOn: blur', () => {
		const form = formInRoot(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' }).form;
		// submitAttempted is false — blur fires but does nothing
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('sets field error on blur after submit attempt with invalid value', async () => {
		const form = formInRoot(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' }).form;
		// Trigger submit attempt (will fail validation)
		await form.submit(makeEvent(), vi.fn());
		// Clear errors to simulate user fixing something
		form.clearErrors();
		// Now blur on email with still-invalid value
		form.validateField('email');
		expect(form.errors.email).toBe('Invalid email');
	});

	it('clears field error when value becomes valid on blur', async () => {
		const form = formInRoot(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' }).form;
		await form.submit(makeEvent(), vi.fn());
		// Fix the email
		form.values.email = 'alice@example.com';
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('reset clears submitAttempted so blur is silenced again', async () => {
		const form = formInRoot(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' }).form;
		await form.submit(makeEvent(), vi.fn());
		form.reset();
		expect(form.submitAttempted).toBe(false);
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('shows a ValidationError without field errors as the generic banner, never Go text', async () => {
		const form = formInRoot(z.object({ email: z.string() }), { email: 'x' }).form;
		await form.submit(makeEvent(), () =>
			Promise.reject(new ValidationError({}, 400, 'mail: missing @'))
		);
		expect(form.bannerError).toBe('The request was not accepted. Check the values and try again.');
		expect(form.errors).toEqual({});
	});

	it('reset(next) reseeds the values', () => {
		const form = formInRoot(testSchema, { email: '', name: '' }).form;
		form.reset({ email: 'a@b.com', name: 'Zed' });
		expect(form.values.name).toBe('Zed');
	});
});

describe('Form generations: a result from a previous open is ignored', () => {
	const valid = { email: 'alice@example.com', name: 'Alice' };
	const gate = () => {
		let release!: () => void;
		let fail!: (e: Error) => void;
		const done = new Promise<void>((res, rej) => {
			release = res;
			fail = rej;
		});
		return { done, release, fail };
	};

	it('a late FAILURE after close + reopen sets no banner and no field errors on the new open', async () => {
		const { form, setOpen } = formInRoot(testSchema, valid);
		const g = gate();
		const pending = form.submit(makeEvent(), () => g.done);
		setOpen(false);
		setOpen(true);
		g.fail(new NetworkError('boom'));
		await pending;
		expect(form.bannerError).toBeNull();
		expect(form.errors).toEqual({});
	});

	it('a late FAILURE that lands while closed (not yet reopened) is ignored too', async () => {
		const { form, setOpen } = formInRoot(testSchema, valid);
		const g = gate();
		const pending = form.submit(makeEvent(), () => g.done);
		setOpen(false);
		g.fail(new NetworkError('boom'));
		await pending;
		expect(form.bannerError).toBeNull();
	});

	it('a late SUCCESS tells the callback it is no longer current, so it can skip its own close', async () => {
		const { form, setOpen } = formInRoot(testSchema, valid);
		const g = gate();
		const close = vi.fn();
		const pending = form.submit(makeEvent(), async (_v, current) => {
			await g.done;
			if (!current()) return;
			close();
		});
		setOpen(false);
		setOpen(true);
		g.release();
		await pending;
		expect(close).not.toHaveBeenCalled();
	});

	it('a late result does not clear the busy flag of the new open', async () => {
		const { form, setOpen } = formInRoot(testSchema, valid);
		const first = gate();
		const second = gate();
		const p1 = form.submit(makeEvent(), () => first.done);
		setOpen(false);
		setOpen(true);
		const p2 = form.submit(makeEvent(), () => second.done);
		expect(form.isSubmitting).toBe(true);
		first.release();
		await p1;
		expect(form.isSubmitting).toBe(true);
		second.release();
		await p2;
		expect(form.isSubmitting).toBe(false);
	});

	it('within one open, a result is current: success closes, failure shows its banner', async () => {
		const { form } = formInRoot(testSchema, valid);
		const close = vi.fn();
		await form.submit(makeEvent(), (_v, current) => {
			if (current()) close();
			return Promise.resolve();
		});
		expect(close).toHaveBeenCalledTimes(1);
		await form.submit(makeEvent(), () => Promise.reject(new NetworkError('x')));
		expect(form.bannerError).not.toBeNull();
	});

	it('reset() also starts a new generation', async () => {
		const { form } = formInRoot(testSchema, valid);
		const g = gate();
		const pending = form.submit(makeEvent(), () => g.done);
		form.reset();
		g.fail(new NetworkError('boom'));
		await pending;
		expect(form.bannerError).toBeNull();
	});
});

describe('Form.submit — one submit in flight at a time', () => {
	const deferred = () => {
		let resolve!: () => void;
		const promise = new Promise<void>((r) => (resolve = r));
		return { promise, resolve };
	};
	const valid = { email: 'alice@example.com', name: 'Alice' };

	it('ignores a second submit (a double click, Enter then click) while the first is running', async () => {
		const form = formInRoot(testSchema, valid).form;
		const gate = deferred();
		const submitFn = vi.fn(() => gate.promise);

		const first = form.submit(makeEvent(), submitFn);
		const second = form.submit(makeEvent(), submitFn);
		await second;
		expect(submitFn).toHaveBeenCalledTimes(1);

		gate.resolve();
		await first;
		expect(form.isSubmitting).toBe(false);
	});

	it('still prevents the browser default for the ignored submit', async () => {
		const form = formInRoot(testSchema, valid).form;
		const gate = deferred();
		void form.submit(makeEvent(), () => gate.promise);
		const e = makeEvent();
		await form.submit(e, vi.fn());
		expect(e.preventDefault).toHaveBeenCalled();
		gate.resolve();
	});

	it('accepts the next submit once the first has finished', async () => {
		const form = formInRoot(testSchema, valid).form;
		const submitFn = vi.fn().mockResolvedValue(undefined);
		await form.submit(makeEvent(), submitFn);
		await form.submit(makeEvent(), submitFn);
		expect(submitFn).toHaveBeenCalledTimes(2);
	});

	it('a reset starts a new generation: a submit may start while the old one is still running', async () => {
		const form = formInRoot(testSchema, valid).form;
		const gate = deferred();
		const old = form.submit(makeEvent(), () => gate.promise);
		form.reset(valid);
		const fresh = vi.fn().mockResolvedValue(undefined);
		await form.submit(makeEvent(), fresh);
		expect(fresh).toHaveBeenCalledTimes(1);
		gate.resolve();
		await old;
	});
});

describe('Form.submit: focus moves to the first invalid field', () => {
	function formElement() {
		const el = document.createElement('form');
		el.innerHTML =
			'<input name="ok" /><input name="email" aria-invalid="true" /><input name="name" aria-invalid="true" />';
		document.body.append(el);
		return el;
	}
	const eventFor = (el: HTMLElement) =>
		({ preventDefault: vi.fn(), currentTarget: el }) as unknown as SubmitEvent;

	it('a client validation failure focuses the first aria-invalid control, in document order', async () => {
		const el = formElement();
		const form = formInRoot(testSchema, { email: 'nope', name: 'x' }).form;
		await form.submit(eventFor(el), vi.fn());
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(el.querySelector('input[name="email"]'))
		);
		el.remove();
	});

	it('a server ValidationError with field errors focuses it too', async () => {
		const el = formElement();
		const form = formInRoot(testSchema, { email: 'a@b.com', name: 'Alice' }).form;
		await form.submit(eventFor(el), () => {
			throw new ValidationError({ name: 'Taken' }, 422);
		});
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(el.querySelector('input[name="email"]'))
		);
		el.remove();
	});

	it('a control holding text it could not read (data-unreadable) blocks the submit and takes focus', async () => {
		const el = document.createElement('form');
		el.innerHTML =
			'<input name="a" /><input name="amount" aria-invalid="true" data-unreadable="true" />';
		document.body.append(el);
		const form = formInRoot(testSchema, { email: 'a@b.com', name: 'Alice' }).form;
		const submitFn = vi.fn().mockResolvedValue(undefined);
		await form.submit(eventFor(el), submitFn);
		expect(submitFn).not.toHaveBeenCalled();
		await vi.waitFor(() =>
			expect(document.activeElement).toBe(el.querySelector('input[name="amount"]'))
		);
		// fixing the text lifts the block
		el.querySelector('input[name="amount"]')!.removeAttribute('data-unreadable');
		await form.submit(eventFor(el), submitFn);
		expect(submitFn).toHaveBeenCalledTimes(1);
		el.remove();
	});

	it('a success moves no focus', async () => {
		const el = formElement();
		(document.activeElement as HTMLElement | null)?.blur();
		const form = formInRoot(testSchema, { email: 'a@b.com', name: 'Alice' }).form;
		await form.submit(eventFor(el), () => Promise.resolve());
		await new Promise((r) => setTimeout(r, 20));
		expect(el.contains(document.activeElement)).toBe(false);
		el.remove();
	});
});

describe('Form.submit: a validation error for a field the form does not render', () => {
	const eventFor = (el: HTMLElement) =>
		({ preventDefault: vi.fn(), currentTarget: el }) as unknown as SubmitEvent;
	const formWith = (names: string[]) => {
		const el = document.createElement('form');
		el.innerHTML = names.map((n) => `<input name="${n}" />`).join('');
		document.body.append(el);
		return el;
	};

	it('shows in the banner (never nothing), and the rendered fields keep their own errors', async () => {
		const el = formWith(['email', 'name']);
		const form = formInRoot(testSchema, { email: 'a@b.com', name: 'Alice' }).form;
		await form.submit(eventFor(el), () => {
			throw new ValidationError({ admin_first_name: 'too_long', name: 'too_long' }, 422);
		});
		expect(form.bannerError).toBeTruthy();
		expect(form.bannerError).not.toContain('admin_first_name');
		expect(form.errors.admin_first_name).toBeUndefined();
		expect(form.errors.name).toBeTruthy();
		el.remove();
	});

	it('only rendered fields: no banner, the field shows the error', async () => {
		const el = formWith(['email', 'name']);
		const form = formInRoot(testSchema, { email: 'a@b.com', name: 'Alice' }).form;
		await form.submit(eventFor(el), () => {
			throw new ValidationError({ name: 'too_long' }, 422);
		});
		expect(form.bannerError).toBeNull();
		expect(form.errors.name).toBeTruthy();
		el.remove();
	});
});
