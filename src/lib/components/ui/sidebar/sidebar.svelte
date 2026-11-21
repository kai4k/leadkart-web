<script lang="ts">
	import { _ } from 'svelte-i18n';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import { useSidebar } from './context.svelte.ts';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		side = 'left',
		variant = 'sidebar',
		collapsible = 'offcanvas',
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		side?: 'left' | 'right';
		variant?: 'sidebar' | 'floating' | 'inset';
		collapsible?: 'offcanvas' | 'icon' | 'none';
	} = $props();

	const sidebar = useSidebar();
</script>

{#if collapsible === 'none'}
	<div
		class={cn(
			'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</div>
{:else if sidebar.isMobile}
	<Sheet.Root bind:open={() => sidebar.openMobile, (v) => sidebar.setOpenMobile(v)} {...restProps}>
		<Sheet.Content
			bind:ref
			data-sidebar="sidebar"
			data-slot="sidebar"
			data-mobile="true"
			title={$_('common.navigation')}
			titleHidden
			class={cn(
				'material-sidebar p-0 text-sidebar-foreground data-[side=left]:w-(--sidebar-width-mobile) data-[side=right]:w-(--sidebar-width-mobile)',
				className
			)}
			{side}
		>
			<div class="flex h-full w-full flex-col pt-(--safe-top)">
				{@render children?.()}
			</div>
		</Sheet.Content>
	</Sheet.Root>
{:else}
	<div
		bind:this={ref}
		class="group peer hidden text-sidebar-foreground lg:block"
		data-state={sidebar.state}
		data-collapsible={sidebar.state === 'collapsed' ? collapsible : ''}
		data-variant={variant}
		data-side={side}
		data-slot="sidebar"
	>
		<!-- The shell offsets the page by `--shell-content-start` (layouts.css), so there is no in-flow
		     gap element here. -->
		<div
			data-slot="sidebar-container"
			data-side={side}
			class={cn(
				'fixed top-[max(var(--shell-sidebar-top),var(--safe-top))] bottom-(--shell-sidebar-bottom) z-(--z-sticky) hidden w-(--sidebar-width) transition-[inset,width] duration-200 ease-linear data-[side=left]:start-(--shell-sidebar-start) data-[side=right]:end-(--shell-sidebar-start) lg:flex',
				// Adjust the padding for floating and inset variants.
				variant === 'floating' || variant === 'inset'
					? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+--spacing(4)+2px)]'
					: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
				className
			)}
			{...restProps}
		>
			<div
				data-sidebar="sidebar"
				data-slot="sidebar-inner"
				class="material-sidebar flex size-full flex-col overflow-hidden group-data-[variant=floating]:rounded-lg [:root[data-layout=semibox]_&]:rounded-(--shell-radius)"
			>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
