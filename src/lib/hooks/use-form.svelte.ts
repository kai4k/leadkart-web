/**
 * `useForm` — lightweight Zod-backed form state for Svelte 5 runes.
 *
 * Canonical pattern for all form components in this codebase. Wraps
 * the submit lifecycle: client-side Zod parse → mutation call →
 * ValidationError.fields mapping → toast on success.
 *
 * Svelte canon: a factory closing over `$state` and returning an
 * object whose `values` / `errors` / `bannerError` / `isSubmitting`
 * fields are reactive (proxied `$state`), and whose `submit` /
 * `reset` / `validateField` / `clearErrors` are plain functions.
 * No classes, no `this`.
 *
 * Usage:
 *   const form = useForm(mySchema, { field1: '', field2: 0 });
 *   // In template: bind:value={form.values.field1}
 *   //              error={form.errors.field1}
 *   // On submit:   form.submit(e, async (values) => mutation.mutate(values))
 */
import { ApiError, ValidationError } from '$api/errors';
import type { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- z.ZodObject's generic args are intentionally any-typed at the call-site of useForm
type AnyObjectSchema = z.ZodObject<any, any>;

/** Field-level validation errors — keyed by field name. */
export type FieldErrors = Record<string, string | undefined>;

/**
 * Options for useForm.
 *
 * validateOn:
 *   'submit' (default) — validation only fires on submit attempt.
 *   'blur'            — field-level validation fires on blur, BUT
 *                        only AFTER the first submit attempt. Before
 *                        that, blur is silent so the user isn't
 *                        ambushed by red errors on empty fields they
 *                        haven't tried to save yet (canon UX per
 *                        NN/g Forms research + Stripe / GitHub).
 */
export type FormOpts = {
	validateOn?: 'submit' | 'blur';
};

export interface Form<TSchema extends AnyObjectSchema> {
	readonly schema: TSchema;
	readonly initial: z.input<TSchema>;
	values: z.input<TSchema>;
	errors: FieldErrors;
	bannerError: string | null;
	isSubmitting: boolean;
	/** True once the user has attempted to submit. Gate for blur-validation. */
	submitAttempted: boolean;
	reset(): void;
	clearErrors(): void;
	validateField(field: string): void;
	submit(e: SubmitEvent, submitFn: (values: z.output<TSchema>) => Promise<void>): Promise<void>;
}

export function useForm<TSchema extends AnyObjectSchema>(
	schema: TSchema,
	initial: z.input<TSchema>,
	opts: FormOpts = {}
): Form<TSchema> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let values: z.input<TSchema> = $state({ ...initial } as any);
	let errors: FieldErrors = $state({});
	let bannerError: string | null = $state(null);
	let isSubmitting = $state(false);
	let submitAttempted = $state(false);

	function reset(): void {
		values = { ...initial };
		errors = {};
		bannerError = null;
		isSubmitting = false;
		submitAttempted = false;
	}

	function clearErrors(): void {
		errors = {};
		bannerError = null;
	}

	function validateField(field: string): void {
		if (!submitAttempted || opts.validateOn !== 'blur') return;
		const result = schema.safeParse(values);
		const fieldError = result.success
			? undefined
			: (result.error.flatten().fieldErrors as Record<string, string[] | undefined>)[field]?.[0];

		if (fieldError) {
			errors = { ...errors, [field]: fieldError };
		} else if (field in errors) {
			const { [field]: _omitted, ...rest } = errors;
			errors = rest;
		}
	}

	async function submit(
		e: SubmitEvent,
		submitFn: (values: z.output<TSchema>) => Promise<void>
	): Promise<void> {
		e.preventDefault();
		submitAttempted = true;
		clearErrors();

		const result = schema.safeParse(values);
		if (!result.success) {
			const flat = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
			const mapped: Record<string, string> = {};
			for (const key of Object.keys(flat)) {
				const msg = flat[key]?.[0];
				if (msg) mapped[key] = msg;
			}
			errors = mapped;
			return;
		}

		isSubmitting = true;
		try {
			await submitFn(result.data as z.output<TSchema>);
		} catch (err) {
			if (err instanceof ValidationError) {
				errors = err.fields as FieldErrors;
			} else if (err instanceof ApiError) {
				// ApiError.message is the typed accessor for the wire-level
				// detail string (RFC 9457 `detail` / legacy `message`); using
				// it on a known-subclass instance is canon-legal.
				bannerError = err.message || 'An unexpected error occurred';
			} else {
				bannerError = 'An unexpected error occurred';
			}
		} finally {
			isSubmitting = false;
		}
	}

	return {
		schema,
		initial,
		get values() {
			return values;
		},
		set values(v) {
			values = v;
		},
		get errors() {
			return errors;
		},
		set errors(v) {
			errors = v;
		},
		get bannerError() {
			return bannerError;
		},
		set bannerError(v) {
			bannerError = v;
		},
		get isSubmitting() {
			return isSubmitting;
		},
		set isSubmitting(v) {
			isSubmitting = v;
		},
		get submitAttempted() {
			return submitAttempted;
		},
		set submitAttempted(v) {
			submitAttempted = v;
		},
		reset,
		clearErrors,
		validateField,
		submit
	};
}
