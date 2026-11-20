<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { PanelLeft } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { useSidebar } from './context.svelte.ts';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		onclick,
		label,
		...restProps
	}: ComponentProps<typeof Button> & {
		onclick?: (e: MouseEvent) => void;
		/** The accessible name; the default is the localised `shell.toggleSidebar`. */
		label?: string;
	} = $props();

	const sidebar = useSidebar();
	const expanded = $derived(sidebar.isMobile ? sidebar.openMobile : sidebar.open);
</script>

<Button
	bind:ref
	data-sidebar="trigger"
	data-slot="sidebar-trigger"
	variant="ghost"
	size="icon-sm"
	class={cn(className)}
	type="button"
	aria-expanded={expanded}
	onclick={(e) => {
		onclick?.(e);
		sidebar.toggle();
	}}
	{...restProps}
>
	<PanelLeft class="rtl:rotate-180" />
	<span class="sr-only">{label ?? $_('shell.toggleSidebar')}</span>
</Button>
