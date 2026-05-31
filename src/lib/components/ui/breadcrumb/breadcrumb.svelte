<script lang="ts" module>
	import type { Component } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	export type BreadcrumbItem = { href?: ResolvedPathname; label: string; icon?: Component };
</script>

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronRight, Icon } from '$icons';
	import { cn, type WithElementRef } from '$lib/utils/cn';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & { items: BreadcrumbItem[] };
	let { ref = $bindable(null), items, class: className = '', ...rest }: Props = $props();

	const forwardRef: Attachment = (node) => {
		ref = node as HTMLElement;
		return () => {
			ref = null;
		};
	};
</script>

<nav
	{@attach forwardRef}
	data-slot="breadcrumb"
	aria-label="Breadcrumb"
	class={cn('flex items-center', className)}
	{...rest}
>
	<ol class="flex flex-wrap items-center gap-1">
		{#each items as item, i (item.label)}
			{@const isLast = i === items.length - 1}
			<li class="flex items-center gap-1">
				{#if i > 0}<Icon icon={ChevronRight} size="xs" class="text-fg-subtle flex-shrink-0" />{/if}
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
					{@const href = item.href as ResolvedPathname}
					<a
						{href}
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
