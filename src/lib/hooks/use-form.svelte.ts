/**
 * `useForm` — lightweight Zod-backed form state for Svelte 5 runes.
 *
 * Canonical pattern for all form components in this codebase. Wraps
 * the submit lifecycle: client-side Zod parse → mutation call →
 * ValidationError.fields mapping → toast on success.
 *
 * A failed submit (client validation or a server `ValidationError`) moves focus to the first invalid
 * field (`focusFirstInvalid`); a form-level failure stays a `role="alert"` banner.
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
import { describeError, ValidationError } from '$api/errors';
import { focusFirstInvalid } from '#lib/utils/focus-first-invalid.ts';
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
	/**
	 * Whether the surface that shows this form is open. Every open and every close starts a new
	 * generation (as does `reset()`): a submit started in an older generation is over as far as
	 * this form is concerned, so its late failure sets no banner and its late success runs no
	 * close (the global mutation toast still reports it). Without this, a result that lands after
	 * the busy veto released and the surface was reopened (maybe for another record) would
	 * overwrite or close the new session.
	 */
	open: () => boolean;
};

/** Passed to the submit callback: false once the form has moved on (closed, reopened, reset). */
type SubmitIsCurrent = () => boolean;

export interface Form<TSchema extends AnyObjectSchema> {
	readonly schema: TSchema;
	readonly initial: z.input<TSchema>;
	values: z.input<TSchema>;
	errors: FieldErrors;
	bannerError: string | null;
	isSubmitting: boolean;
	/** True once the user has attempted to submit. Gate for blur-validation. */
	submitAttempted: boolean;
	reset(next?: z.input<TSchema>): void;
	clearErrors(): void;
	validateField(field: string): void;
	submit(
		e: SubmitEvent,
		submitFn: (values: z.output<TSchema>, current: SubmitIsCurrent) => Promise<void>
	): Promise<void>;
}

export function useForm<TSchema extends AnyObjectSchema>(
	schema: TSchema,
	initial: z.input<TSchema>,
	opts: FormOpts
): Form<TSchema> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let values: z.input<TSchema> = $state({ ...initial } as any);
	let errors: FieldErrors = $state({});
	let bannerError: string | null = $state(null);
	let isSubmitting = $state(false);
	let submitAttempted = $state(false);

	// Bumped by every open / close / reset; plain (not reactive): nothing renders it.
	let generation = 0;
	// The latest submit owns the busy flag, whatever generation it started in.
	let latestSubmit = 0;
	// The generation that has a submit in flight, if any: a second submit of the SAME generation is
	// ignored (a double click, Enter then click) without waiting for the button to disable on the
	// next render. A new generation (reopen, reset) may submit while an old one is still running.
	let busyGeneration: number | null = null;
	let wasOpen: boolean | undefined;
	$effect.pre(() => {
		const isOpen = opts.open();
		if (wasOpen !== undefined && isOpen !== wasOpen) generation++;
		wasOpen = isOpen;
	});

	function reset(next?: z.input<TSchema>): void {
		generation++;
		values = { ...(next ?? initial) };
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
		submitFn: (values: z.output<TSchema>, current: SubmitIsCurrent) => Promise<void>
	): Promise<void> {
		e.preventDefault();
		// Captured now: `currentTarget` is null once the handler has awaited.
		const formEl = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
		if (busyGeneration === generation) return;
		const mine = generation;
		const myTurn = ++latestSubmit;
		const current: SubmitIsCurrent = () => generation === mine;
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
			// A failed submit lands on the first invalid field (its error is read with it), instead of
			// every field error being its own assertive announcement.
			void focusFirstInvalid(formEl);
			return;
		}

		isSubmitting = true;
		busyGeneration = mine;
		try {
			await submitFn(result.data as z.output<TSchema>, current);
		} catch (err) {
			if (!current()) return;
			if (err instanceof ValidationError && err.hasFieldErrors) {
				errors = err.fields as FieldErrors;
				void focusFirstInvalid(formEl);
			} else {
				bannerError = describeError(err, { fallback: 'An unexpected error occurred' });
				// nothing is invalid and the submit button was busy: focus goes to the form's alert
				void focusFirstInvalid(formEl);
			}
		} finally {
			if (busyGeneration === mine) busyGeneration = null;
			// A newer submit owns the flag; a stale result must not clear it under that submit.
			if (myTurn === latestSubmit) isSubmitting = false;
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
