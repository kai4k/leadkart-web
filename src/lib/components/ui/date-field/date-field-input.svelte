<script lang="ts">
	import { DateField as DateFieldPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.ts';
	import DateFieldSegment from './date-field-segment.svelte';

	/**
	 * The segment group (`role="group"`). Without `children` it renders every segment in the locale's order (en-IN:
	 * day / month / year). bits sets `aria-describedby` and `aria-labelledby` on the group itself and would overwrite a
	 * caller's, so this wrapper takes them as props and applies them LAST:
	 *   describedBy  the error id then the hint id (the Field.Error has no live role: it is read as the description)
	 *   invalid      `aria-invalid="true"` on the group (focusFirstInvalid finds it and focuses its first segment)
	 *   ariaLabel    names the group instead of the shared label (the range field's "start" and "end")
	 *   name         a hidden input carrying the ISO `YYYY-MM-DD` value for a native form post
	 */
	let {
		ref = $bindable(null),
		class: className,
		describedBy,
		invalid = false,
		ariaLabel,
		children,
		...restProps
	}: Omit<DateFieldPrimitive.InputProps, 'children' | 'child' | 'aria-label'> & {
		describedBy?: string;
		invalid?: boolean;
		ariaLabel?: string;
		children?: Snippet<[{ segments: Array<{ part: string; value: string }> }]>;
	} = $props();
</script>

<DateFieldPrimitive.Input bind:ref {...restProps}>
	{#snippet child({ props, segments })}
		<div
			{...props}
			data-slot="date-field-input"
			class={cn('flex flex-1 items-center', className)}
			aria-describedby={describedBy}
			aria-invalid={invalid || props['data-invalid'] !== undefined ? 'true' : undefined}
			aria-labelledby={ariaLabel ? undefined : (props['aria-labelledby'] as string | undefined)}
			aria-label={ariaLabel}
		>
			{#if children}
				{@render children({ segments })}
			{:else}
				{#each segments as { part, value }, i (i)}
					<DateFieldSegment part={part as never}>{value}</DateFieldSegment>
				{/each}
			{/if}
		</div>
	{/snippet}
</DateFieldPrimitive.Input>
