<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList | null } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'dark:bg-input-fill border-input focus-visible:border-ring focus-visible:ring-ring   aria-invalid:border-destructive  disabled:bg-muted dark:disabled:bg-muted h-10 rounded-md border bg-transparent px-4 py-2 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3  md:text-sm w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'dark:bg-input-fill border-input focus-visible:border-ring focus-visible:ring-ring   aria-invalid:border-destructive  disabled:bg-muted dark:disabled:bg-muted h-10 rounded-md border bg-transparent px-4 py-2 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3  md:text-sm w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
