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
import { ValidationError } from '$api/errors';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObjectSchema = z.ZodObject<any, any>;

/** Field-level validation errors — keyed by field name. */
export type FieldErrors = Record<string, string | undefined>;

export class FormState<TSchema extends AnyObjectSchema> {
	readonly schema: TSchema;
	readonly initial: z.input<TSchema>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	values: z.input<TSchema> = $state({} as any);
	errors: FieldErrors = $state({});
	bannerError: string | null = $state(null);
	isSubmitting: boolean = $state(false);

	constructor(schema: TSchema, initial: z.input<TSchema>) {
		this.schema = schema;
		this.initial = initial;
		this.values = { ...initial };
	}

	reset(): void {
		this.values = { ...this.initial };
		this.errors = {};
		this.bannerError = null;
		this.isSubmitting = false;
	}

	clearErrors(): void {
		this.errors = {};
		this.bannerError = null;
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
			} else {
				this.bannerError = err instanceof Error ? err.message : 'An unexpected error occurred';
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
 */
export function useForm<TSchema extends AnyObjectSchema>(
	schema: TSchema,
	initial: z.input<TSchema>
): FormState<TSchema> {
	return new FormState(schema, initial);
}
