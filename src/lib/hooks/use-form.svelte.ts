/**
 * useForm — lightweight Zod-backed form state for Svelte 5 runes.
 *
 * Canonical pattern for all form components in this codebase. Wraps
 * the submit lifecycle: client-side Zod parse → mutation call →
 * ValidationError.fields mapping → toast on success.
 *
 * Usage:
 *   const form = useForm(mySchema, { field1: '', field2: 0 });
 *   // In template: bind:value={form.values.field1}
 *   //              error={form.errors.field1}
 *   // On submit:   form.submit(e, async (values) => mutation.mutate(values))
 *
 * Module-level `let foo = $state(...)` is BANNED (CLAUDE.md). This is
 * a CLASS with $state fields — the canonical cross-module reactive pattern.
 */
import { ApiError, ValidationError } from '$api/errors';
import type { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- z.ZodObject's generic args are intentionally any-typed at the call-site of useForm
type AnyObjectSchema = z.ZodObject<any, any>;

/** Field-level validation errors — keyed by field name. */
export type FieldErrors = Record<string, string | undefined>;

/**
 * Options for useForm / FormState.
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

export class FormState<TSchema extends AnyObjectSchema> {
	readonly schema: TSchema;
	readonly initial: z.input<TSchema>;
	readonly opts: FormOpts;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	values: z.input<TSchema> = $state({} as any);
	errors: FieldErrors = $state({});
	bannerError: string | null = $state(null);
	isSubmitting: boolean = $state(false);
	/** True once the user has attempted to submit. Gate for blur-validation. */
	submitAttempted: boolean = $state(false);

	constructor(schema: TSchema, initial: z.input<TSchema>, opts: FormOpts = {}) {
		this.schema = schema;
		this.initial = initial;
		this.opts = opts;
		this.values = { ...initial };
	}

	reset(): void {
		this.values = { ...this.initial };
		this.errors = {};
		this.bannerError = null;
		this.isSubmitting = false;
		this.submitAttempted = false;
	}

	clearErrors(): void {
		this.errors = {};
		this.bannerError = null;
	}

	/**
	 * Validate a single field and update `errors` in place.
	 *
	 * Only fires when:
	 *   - opts.validateOn === 'blur'
	 *   - AND the user has already attempted to submit once
	 *
	 * Calling it before first submit is a no-op (silent). This mirrors
	 * the canonical UX rule: don't yell at users for fields they haven't
	 * tried to save yet.
	 *
	 * Usage in a form component:
	 *   <TextField onblur={() => form.validateField('email')} ... />
	 */
	validateField(field: string): void {
		if (!this.submitAttempted || this.opts.validateOn !== 'blur') return;
		const result = this.schema.safeParse(this.values);
		// Extract only this field's error regardless of overall parse outcome.
		const fieldError = result.success
			? undefined
			: (result.error.flatten().fieldErrors as Record<string, string[] | undefined>)[field]?.[0];

		if (fieldError) {
			// Field still has an error — update it.
			this.errors = { ...this.errors, [field]: fieldError };
		} else if (field in this.errors) {
			// Field is now valid — clear its error (check key presence, not truthiness).
			const { [field]: _omitted, ...rest } = this.errors;
			this.errors = rest;
		}
	}

	/**
	 * Run the Zod parse + call submitFn with the parsed (output) values.
	 * Catches ValidationError (field-level) and any other error (banner).
	 *
	 * @param e — the SubmitEvent (calls e.preventDefault()).
	 * @param submitFn — receives the parsed, type-safe output values.
	 *   Should return a Promise; rejection is caught as bannerError.
	 */
	async submit(
		e: SubmitEvent,
		submitFn: (values: z.output<TSchema>) => Promise<void>
	): Promise<void> {
		e.preventDefault();
		this.submitAttempted = true;
		this.clearErrors();

		const result = this.schema.safeParse(this.values);
		if (!result.success) {
			const flat = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
			const mapped: Record<string, string> = {};
			for (const key of Object.keys(flat)) {
				const msg = flat[key]?.[0];
				if (msg) mapped[key] = msg;
			}
			this.errors = mapped;
			return;
		}

		this.isSubmitting = true;
		try {
			await submitFn(result.data as z.output<TSchema>);
		} catch (err) {
			if (err instanceof ValidationError) {
				this.errors = err.fields as FieldErrors;
			} else if (err instanceof ApiError) {
				// ApiError.message is the typed accessor for the wire-level
				// detail string (RFC 9457 `detail` / legacy `message`); using
				// it on a known-subclass instance is canon-legal — the rule
				// 12 ban applies to bare `err.message` in untyped catches.
				this.bannerError = err.message || 'An unexpected error occurred';
			} else {
				this.bannerError = 'An unexpected error occurred';
			}
		} finally {
			this.isSubmitting = false;
		}
	}
}

/**
 * Factory function — creates a FormState instance for use in
 * Svelte 5 component `<script>` blocks.
 *
 * Example:
 *   const form = useForm(createUserSchema, { email: '', first_name: '' });
 *   // With blur validation (fires only after first submit attempt):
 *   const form = useForm(schema, initial, { validateOn: 'blur' });
 */
export function useForm<TSchema extends AnyObjectSchema>(
	schema: TSchema,
	initial: z.input<TSchema>,
	opts?: FormOpts
): FormState<TSchema> {
	return new FormState(schema, initial, opts);
}
