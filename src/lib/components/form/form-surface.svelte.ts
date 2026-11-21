/**
 * The logic `FormSheet` and `FormDialog` share (so the two cannot drift apart): the form state, the
 * reset on every open, the dirty check and the leave guard, and the one submit handler.
 *
 * Props arrive as a getter (`() => ({ ... })`) so a parent that swaps `schema`, `initial` or `onSubmit`
 * is followed; the factory reads them at the time they are used.
 */
import { untrack, type Snippet } from 'svelte';
import type { z } from 'zod';
import { useForm, type Form } from '#lib/hooks/use-form.svelte.ts';
import { useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the schema's generic args are intentionally any-typed, as in useForm
export type AnyObjectSchema = z.ZodObject<any, any>;

export type FormSurfaceProps<S extends AnyObjectSchema> = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	submitLabel: string;
	/** `destructive` for a form whose submit removes or revokes something. */
	submitVariant?: 'default' | 'destructive';
	schema: S;
	/** Re-read every time the surface opens: a reopened form never shows the previous session's values. */
	initial: () => z.input<S>;
	/** Pass the mutation's `mutateAsync`: a rejection becomes the banner or the field errors, success closes. */
	onSubmit: (values: z.output<S>) => Promise<void>;
	fields: Snippet<[Form<S>]>;
	/** The `<form id>`: the submit button lives in the footer and points at it with `form=`. */
	formId: string;
	size?: 'md' | 'lg';
	/** Ask before leaving the page with unsaved input while open. Default true. */
	guardLeave?: boolean;
};

type Source<S extends AnyObjectSchema> = Pick<
	FormSurfaceProps<S>,
	'open' | 'onOpenChange' | 'schema' | 'initial' | 'onSubmit' | 'guardLeave'
>;

export interface FormSurface<S extends AnyObjectSchema> {
	readonly form: Form<S>;
	readonly dirty: boolean;
	submit(e: SubmitEvent): Promise<void>;
}

export function createFormSurface<S extends AnyObjectSchema>(
	source: () => Source<S>
): FormSurface<S> {
	const first = untrack(source);
	const form = useForm(
		first.schema,
		untrack(() => first.initial()),
		{
			open: () => source().open
		}
	);

	// What the form held when it opened: "dirty" is a change from that, not from the empty form.
	let seed = $state(JSON.stringify(untrack(() => form.values)));
	$effect.pre(() => {
		if (!source().open) return;
		untrack(() => {
			form.reset(source().initial());
			seed = JSON.stringify(form.values);
		});
	});
	const dirty = $derived(JSON.stringify(form.values) !== seed);

	useLeaveGuard(() => {
		const s = source();
		return s.open && (s.guardLeave ?? true) && dirty;
	});

	function submit(e: SubmitEvent): Promise<void> {
		return form.submit(e, async (values, current) => {
			await source().onSubmit(values);
			// a result that lands after the surface was closed or reopened closes nothing
			if (current()) source().onOpenChange(false);
		});
	}

	return {
		form,
		get dirty() {
			return dirty;
		},
		submit
	};
}
