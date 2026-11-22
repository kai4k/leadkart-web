<script lang="ts" generics="S extends AnyObjectSchema">
	import type { Snippet } from 'svelte';
	import FormOutcome from './FormOutcome.svelte';
	import type { Form } from '#lib/hooks/use-form.svelte.ts';
	import type { AnyObjectSchema } from './form-surface.svelte.ts';

	/**
	 * The `<form>` inside a FormSheet or FormDialog: the one banner (`FormOutcome`: a form-level failure, `role="alert"`, opaque)
	 * above the fields, which the caller renders from the form state. Not a public component: use FormSheet / FormDialog.
	 */
	let {
		form,
		formId,
		onsubmit,
		resetKey,
		fields
	}: {
		form: Form<S>;
		formId: string;
		onsubmit: (e: SubmitEvent) => void;
		/** Changes when the form is reset: the fields are rebuilt (typed date fields keep their own text otherwise). */
		resetKey: number;
		fields: Snippet<[Form<S>]>;
	} = $props();
</script>

<form id={formId} class="stack stack-relaxed" {onsubmit} novalidate>
	<FormOutcome error={form.bannerError} />
	{#key resetKey}
		{@render fields(form)}
	{/key}
</form>
