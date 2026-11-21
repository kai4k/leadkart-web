<script lang="ts" generics="S extends AnyObjectSchema">
	import type { Snippet } from 'svelte';
	import { Alert } from '#lib/components/ui/alert/index.ts';
	import type { Form } from '#lib/hooks/use-form.svelte.ts';
	import type { AnyObjectSchema } from './form-surface.svelte.ts';

	/**
	 * The `<form>` inside a FormSheet or FormDialog: the one banner (a form-level failure, `role="alert"`, opaque)
	 * above the fields, which the caller renders from the form state. Not a public component: use FormSheet / FormDialog.
	 */
	let {
		form,
		formId,
		onsubmit,
		fields
	}: {
		form: Form<S>;
		formId: string;
		onsubmit: (e: SubmitEvent) => void;
		fields: Snippet<[Form<S>]>;
	} = $props();
</script>

<form id={formId} class="stack stack-relaxed" {onsubmit} novalidate>
	{#if form.bannerError}<Alert variant="destructive">{form.bannerError}</Alert>{/if}
	{@render fields(form)}
</form>
