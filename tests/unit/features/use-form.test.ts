/**
 * Unit tests for the useForm hook (FormState class).
 * Covers the client-side Zod validation path, error surface,
 * bannerError on unexpected throws, and ValidationError field mapping.
 */
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FormState, useForm } from '$lib/hooks/use-form.svelte';
import { ValidationError } from '$lib/api/errors';

const testSchema = z.object({
	email: z.string().email('Invalid email'),
	name: z.string().min(2, 'Name too short')
});

function makeEvent(): SubmitEvent {
	return { preventDefault: vi.fn() } as unknown as SubmitEvent;
}

describe('useForm factory', () => {
	it('returns a FormState instance', () => {
		const form = useForm(testSchema, { email: '', name: '' });
		expect(form).toBeInstanceOf(FormState);
	});

	it('initialises values from the initial argument', () => {
		const form = useForm(testSchema, { email: 'a@b.com', name: 'Alice' });
		expect(form.values.email).toBe('a@b.com');
		expect(form.values.name).toBe('Alice');
	});
});

describe('FormState.submit — client-side Zod validation', () => {
	it('sets field errors and does NOT call submitFn when validation fails', async () => {
		const form = useForm(testSchema, { email: 'not-an-email', name: 'x' });
		const submitFn = vi.fn();

		await form.submit(makeEvent(), submitFn);

		expect(submitFn).not.toHaveBeenCalled();
		expect(form.errors.email).toBe('Invalid email');
		expect(form.errors.name).toBe('Name too short');
		expect(form.isSubmitting).toBe(false);
	});

	it('calls submitFn with parsed output when values are valid', async () => {
		const form = useForm(testSchema, { email: 'alice@example.com', name: 'Alice' });
		const submitFn = vi.fn().mockResolvedValue(undefined);

		await form.submit(makeEvent(), submitFn);

		expect(submitFn).toHaveBeenCalledWith({ email: 'alice@example.com', name: 'Alice' });
		expect(form.errors).toEqual({});
		expect(form.bannerError).toBeNull();
		expect(form.isSubmitting).toBe(false);
	});
});

describe('FormState.submit — error handling', () => {
	it('maps ValidationError.fields to form.errors', async () => {
		const form = useForm(testSchema, { email: 'alice@example.com', name: 'Alice' });
		const ve = new ValidationError({ email: 'Already taken' }, 422);
		const submitFn = vi.fn().mockRejectedValue(ve);

		await form.submit(makeEvent(), submitFn);

		expect(form.errors.email).toBe('Already taken');
		expect(form.bannerError).toBeNull();
	});

	it('sets bannerError for non-ValidationError throws', async () => {
		const form = useForm(testSchema, { email: 'alice@example.com', name: 'Alice' });
		const submitFn = vi.fn().mockRejectedValue(new Error('Network error'));

		await form.submit(makeEvent(), submitFn);

		expect(form.bannerError).toBe('Network error');
		expect(form.errors).toEqual({});
	});

	it('sets bannerError to generic message for non-Error throws', async () => {
		const form = useForm(testSchema, { email: 'alice@example.com', name: 'Alice' });
		const submitFn = vi.fn().mockRejectedValue('string error');

		await form.submit(makeEvent(), submitFn);

		expect(form.bannerError).toBe('An unexpected error occurred');
	});
});

describe('FormState.reset', () => {
	it('restores initial values and clears errors/bannerError', async () => {
		const form = useForm(testSchema, { email: '', name: '' });
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

describe('FormState.clearErrors', () => {
	it('clears field errors and bannerError without touching values', () => {
		const form = useForm(testSchema, { email: '', name: '' });
		form.values.email = 'alice@example.com';
		form.errors = { name: 'too short' };
		form.bannerError = 'server error';

		form.clearErrors();

		expect(form.values.email).toBe('alice@example.com');
		expect(form.errors).toEqual({});
		expect(form.bannerError).toBeNull();
	});
});

describe('FormState.validateField — blur validation', () => {
	it('is a no-op when validateOn is not blur', () => {
		const form = useForm(testSchema, { email: 'bad', name: 'x' });
		// submitAttempted defaults false; even if we set it, without validateOn blur it no-ops
		form.submitAttempted = true;
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('is a no-op before first submit attempt even with validateOn: blur', () => {
		const form = useForm(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' });
		// submitAttempted is false — blur fires but does nothing
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('sets field error on blur after submit attempt with invalid value', async () => {
		const form = useForm(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' });
		// Trigger submit attempt (will fail validation)
		await form.submit(makeEvent(), vi.fn());
		// Clear errors to simulate user fixing something
		form.clearErrors();
		// Now blur on email with still-invalid value
		form.validateField('email');
		expect(form.errors.email).toBe('Invalid email');
	});

	it('clears field error when value becomes valid on blur', async () => {
		const form = useForm(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' });
		await form.submit(makeEvent(), vi.fn());
		// Fix the email
		form.values.email = 'alice@example.com';
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});

	it('reset clears submitAttempted so blur is silenced again', async () => {
		const form = useForm(testSchema, { email: 'bad', name: 'x' }, { validateOn: 'blur' });
		await form.submit(makeEvent(), vi.fn());
		form.reset();
		expect(form.submitAttempted).toBe(false);
		form.validateField('email');
		expect(form.errors.email).toBeUndefined();
	});
});
