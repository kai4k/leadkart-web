<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		errors,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		children?: Snippet;
		errors?: { message?: string }[];
	} = $props();

	const hasContent = $derived.by(() => {
		// has slotted error
		if (children) return true;

		// no errors
		if (!errors || errors.length === 0) return false;

		// has an error but no message
		if (errors.length === 1 && !errors[0]?.message) {
			return false;
		}

		return true;
	});

	const isMultipleErrors = $derived(errors && errors.length > 1);
	const singleErrorMessage = $derived(errors && errors.length === 1 && errors[0]?.message);
</script>

<!--
	No live role: with six invalid fields that was six assertive announcements. A failed submit moves
	focus to the first invalid control (`focusFirstInvalid`), and `aria-describedby` on each control
	lists this error first, so a screen reader reads the field with its error when it is reached.
	A form-level (non-field) error is an `Alert`, which keeps `role="alert"`.
-->
{#if hasContent}
	<div
		bind:this={ref}
		data-slot="field-error"
		class={cn('text-destructive text-sm font-normal', className)}
		{...restProps}
	>
		{#if children}
			{@render children()}
		{:else if singleErrorMessage}
			{singleErrorMessage}
		{:else if isMultipleErrors}
			<ul class="ms-4 flex list-disc flex-col gap-1">
				{#each errors ?? [] as error, index (index)}
					{#if error?.message}
						<li>{error.message}</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</div>
{/if}
