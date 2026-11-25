/**
 * The logic `FormSheet` and `FormDialog` share (so the two cannot drift apart): the form state, the
 * reset on every open, the dirty check and the leave guard, and the one submit handler.
 *
 * Props arrive as a getter (`() => ({ ... })`) so a parent that swaps `schema`, `initial` or `onSubmit`
 * is followed; the factory reads them at the time they are used.
 */
import { untrack, type Snippet } from 'svelte';
import type { z } from 'zod';
import type { DescribeErrorOptions } from '#lib/api/errors.ts';
import { useForm, type Form } from '#lib/hooks/use-form.svelte.ts';
import { guardsSilent, useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the schema's generic args are intentionally any-typed, as in useForm
export type AnyObjectSchema = z.ZodObject<any, any>;

export type FormSurfaceProps<S extends AnyObjectSchema, R = void> = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	submitLabel: string;
	/** `destructive` for a form whose submit removes or revokes something. */
	submitVariant?: 'primary' | 'destructive';
	schema: S;
	/** Re-read every time the surface opens: a reopened form never shows the previous session's values. */
	initial: () => z.input<S>;
	/** Pass the mutation's `mutateAsync`: a rejection becomes the banner or the field errors, success closes. */
	onSubmit: (values: z.output<S>) => Promise<R | void>;
	/** `'blur'`: after the first submit attempt a field is re-checked when the user leaves it. */
	validateOn?: 'submit' | 'blur';
	/** The form's own banner line per status (403 / 404 / 409), for a failure that is not a field error. */
	errorLines?: DescribeErrorOptions['status'];
	fields: Snippet<[Form<S>]>;
	/** The `<form id>`: the submit button lives in the footer and points at it with `form=`. */
	formId: string;
	size?: 'md' | 'lg';
	/** Ask before leaving the page with unsaved input while open. Default true. */
	guardLeave?: boolean;
	/** Close the surface when the submit succeeds. Default true; false when the result is shown in `done`. */
	closeOnSuccess?: boolean;
	/**
	 * With `closeOnSuccess={false}`: what `onSubmit` RETURNED (a one-time credential, a confirmation) is held by the surface
	 * and handed to this snippet, shown INSTEAD of the form and its footer. The surface owns it: a result that arrives for a
	 * submission that is no longer current (the surface was closed or reopened meanwhile) is discarded, and it is cleared on
	 * close and on open, so a one-time secret never outlives its sheet. It owns its own buttons ("Done" calls `onOpenChange(false)`).
	 */
	done?: Snippet<[R, { again: () => void }]>;
};

type Source<S extends AnyObjectSchema, R> = Pick<
	FormSurfaceProps<S, R>,
	| 'open'
	| 'onOpenChange'
	| 'schema'
	| 'initial'
	| 'onSubmit'
	| 'guardLeave'
	| 'closeOnSuccess'
	| 'validateOn'
	| 'errorLines'
>;

export interface FormSurface<S extends AnyObjectSchema, R = void> {
	readonly form: Form<S>;
	/** What the current submission returned (only with `closeOnSuccess={false}`); null before, after close and on open. */
	readonly result: { value: R } | null;
	readonly dirty: boolean;
	/** Changes on every open: the fields are rebuilt then, so a typed date field never keeps text the form reset away. */
	readonly resetKey: number;
	submit(e: SubmitEvent): Promise<void>;
	/** "Add another": drop the result and show an empty form. */
	again(): void;
	/**
	 * A way out (Cancel, the X, Escape, an outside press) must ASK first: there is unsaved input, nothing is being saved,
	 * and no security reload or sign-out is under way (then the surface just closes). Read when the close is attempted.
	 */
	holdsClose(): boolean;
	/** The "Discard changes?" question is on screen. */
	readonly asking: boolean;
	/** A held close was attempted: show the question. */
	ask(): void;
	/** "Keep editing": the question goes away, the form stays as it is. */
	keepEditing(): void;
	/** "Discard": the question goes away and the surface closes (the form is reset by the close). */
	discard(): void;
}

export function createFormSurface<S extends AnyObjectSchema, R = void>(
	source: () => Source<S, R>
): FormSurface<S, R> {
	const first = untrack(source);
	const form = useForm(
		first.schema,
		untrack(() => first.initial()),
		{
			open: () => source().open,
			validateOn: first.validateOn,
			errorLines: () => source().errorLines
		}
	);

	// What the form held when it opened: "dirty" is a change from that, not from the empty form.
	let seed = $state(JSON.stringify(untrack(() => form.values)));
	let resetKey = $state(0);
	let result = $state<{ value: R } | null>(null);
	let asking = $state(false);
	// Open or close: nothing a previous submission produced survives, and what was typed (a password) is dropped on close.
	$effect.pre(() => {
		const open = source().open;
		untrack(() => {
			result = null;
			asking = false;
			if (!open) form.reset(source().initial());
		});
	});
	$effect.pre(() => {
		if (!source().open) return;
		untrack(() => {
			form.reset(source().initial());
			seed = JSON.stringify(form.values);
			resetKey++;
		});
	});
	const dirty = $derived(JSON.stringify(form.values) !== seed);

	useLeaveGuard(() => {
		const s = source();
		return s.open && (s.guardLeave ?? true) && dirty;
	});

	function submit(e: SubmitEvent): Promise<void> {
		return form.submit(e, async (values, current) => {
			const value = await source().onSubmit(values);
			if (!current()) return; // a result that lands after the surface was closed or reopened is discarded
			if (source().closeOnSuccess ?? true) source().onOpenChange(false);
			else {
				if (value !== undefined) result = { value: value as R };
				// what was sent is saved and the result is shown in `done`: the form is empty again (nothing typed, a
				// password included, lingers in its state) and leaving now is not leaving unsaved input
				form.reset(source().initial());
				seed = JSON.stringify(form.values);
				resetKey++;
			}
		});
	}

	const holdsClose = () =>
		source().open &&
		(source().guardLeave ?? true) &&
		dirty &&
		!form.isSubmitting &&
		!guardsSilent();

	function again(): void {
		result = null;
		form.reset(source().initial());
		seed = JSON.stringify(form.values);
		resetKey++;
	}

	return {
		form,
		again,
		holdsClose,
		get asking() {
			return asking;
		},
		ask() {
			asking = true;
		},
		keepEditing() {
			asking = false;
		},
		discard() {
			asking = false;
			source().onOpenChange(false);
		},
		get dirty() {
			return dirty;
		},
		get result() {
			return result;
		},
		get resetKey() {
			return resetKey;
		},
		submit
	};
}
