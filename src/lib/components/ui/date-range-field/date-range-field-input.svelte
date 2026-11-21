<script lang="ts">
	import { DateRangeField as DateRangeFieldPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils/cn.ts';
	import DateFieldSegment from '../date-field/date-field-segment.svelte';

	/**
	 * One end of the range: `type="start"` or `type="end"`, each a `role="group"` of segments (the segments are the
	 * date-field ones). bits-ui gives these inputs `role="presentation"`, so the group role is set here, after its props:
	 * a group is what carries `aria-label` and `aria-invalid`. Same prop contract as `date-field/date-field-input`.
	 */
	let {
		ref = $bindable(null),
		class: className,
		type,
		describedBy,
		invalid = false,
		ariaLabel,
		children,
		...restProps
	}: Omit<DateRangeFieldPrimitive.InputProps, 'children' | 'child' | 'aria-label'> & {
		describedBy?: string;
		invalid?: boolean;
		ariaLabel?: string;
		children?: Snippet<[{ segments: Array<{ part: string; value: string }> }]>;
	} = $props();
</script>

<DateRangeFieldPrimitive.Input bind:ref {type} {...restProps}>
	{#snippet child({ props, segments })}
		<!-- aria-invalid on the group is the contract (focusFirstInvalid finds it; axe accepts it as a global attribute) -->
		<!-- svelte-ignore a11y_role_supports_aria_props -->
		<div
			{...props}
			data-slot="date-range-field-input"
			role="group"
			class={cn('flex items-center', className)}
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
</DateRangeFieldPrimitive.Input>
