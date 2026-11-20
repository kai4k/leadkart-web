/**
 * `useForm` registers an effect (it follows its surface opening and closing), so it needs an
 * effect root outside a component. `surface.open = false; flushSync()` closes it.
 */
import { flushSync } from 'svelte';
import { useForm } from '#lib/hooks/use-form.svelte.ts';
import type { z } from 'zod';

type Schema = Parameters<typeof useForm>[0];

export function formInRoot<TSchema extends Schema>(
	schema: TSchema,
	initial: z.input<TSchema>,
	opts: { validateOn?: 'submit' | 'blur'; startOpen?: boolean } = {}
) {
	const surface = $state({ open: opts.startOpen ?? true });
	let form!: ReturnType<typeof useForm<TSchema>>;
	const dispose = $effect.root(() => {
		form = useForm(schema, initial, { validateOn: opts.validateOn, open: () => surface.open });
	});
	flushSync();
	return {
		form,
		setOpen(open: boolean) {
			surface.open = open;
			flushSync();
		},
		dispose
	};
}
