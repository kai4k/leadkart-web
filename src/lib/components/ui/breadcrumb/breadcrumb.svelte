<script lang="ts" module>
	import type { Component } from 'svelte';

	export type BreadcrumbItem = {
		href?: string;
		label: string;
		icon?: Component;
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronRight, Icon } from '$icons';
	import { cn, resolveHref, type WithElementRef } from '$lib/utils/cn';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		items: BreadcrumbItem[];
	};

	let { ref = $bindable(null), items, class: className = '', ...rest }: Props = $props();
</script>

<nav
	bind:this={ref}
	data-slot="breadcrumb"
	aria-label="Breadcrumb"
	class={cn('flex items-center', className)}
	{...rest}
>
	<ol class="flex flex-wrap items-center gap-1">
		{#each items as item, i (item.label)}
			{@const isLast = i === items.length - 1}
			<li class="flex items-center gap-1">
				{#if i > 0}
					<Icon icon={ChevronRight} size="xs" class="text-fg-subtle flex-shrink-0" />
				{/if}
				{#if isLast || !item.href}
					<span
						class={cn(
							'label-small inline-flex items-center gap-1',
							isLast ? 'text-fg' : 'text-fg-muted'
						)}
						aria-current={isLast ? 'page' : undefined}
					>
						{#if item.icon}<Icon icon={item.icon} size="xs" />{/if}
						{item.label}
					</span>
				{:else}
					<a
						href={resolveHref(item.href)}
						class="label-small text-fg-muted hover:text-fg focus-visible:ring-focus-ring inline-flex items-center gap-1 transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
					>
						{#if item.icon}<Icon icon={item.icon} size="xs" />{/if}
						{item.label}
					</a>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
