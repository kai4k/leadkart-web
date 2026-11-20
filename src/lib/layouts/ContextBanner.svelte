<script lang="ts" module>
	export type ContextBannerTone = 'warning' | 'destructive';
</script>

<script lang="ts">
	/**
	 * One banner for "you are not acting as yourself in your own company": acting inside a tenant
	 * (warning) and impersonating (destructive). It sits between the topbar and the page and does not
	 * scroll away (placement is `layouts.css`, `[data-shell='banners']`), so it is visible and
	 * reachable on every layout. Text is the foreground on the soft status fill (gate:
	 * `foreground on {warning,destructive}-soft`); the tone colours only the icon.
	 */
	import type { Snippet } from 'svelte';
	import { Icon } from '$icons';
	import { resetPending } from '#lib/api/hard-reset.ts';
	import { resetBlock } from '#lib/api/reset-block.svelte.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		tone: ContextBannerTone;
		/** a lucide icon component */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		/** the accessible name of the region */
		label: string;
		children: Snippet;
		/** gets `stale`: the page is out of date (a reset is pending); the control must not act then */
		action?: Snippet<[{ stale: boolean }]>;
	};

	let { tone, icon, label, children, action }: Props = $props();

	// The banner stays (it still says where the page was rendered) but its control must not act on a
	// context the page no longer has: while a reset is under way or its banner is up, `stale`.
	// `resetBlock.kind` is the reactive part; `resetPending()` also covers a reset in flight.
	const stale = $derived(resetBlock.kind !== null || resetPending());
</script>

<div
	role="region"
	aria-label={label}
	data-shell="banner"
	data-tone={tone}
	class={cn(
		'text-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2 text-sm sm:px-5',
		tone === 'warning' && 'bg-warning-soft border-warning',
		tone === 'destructive' && 'bg-destructive-soft border-destructive'
	)}
>
	<div class="flex min-w-0 items-center gap-2">
		<Icon
			{icon}
			size="sm"
			class={cn('shrink-0', tone === 'warning' ? 'text-warning' : 'text-destructive')}
		/>
		<div class="min-w-0">{@render children()}</div>
	</div>
	{#if action}
		<div class="shrink-0">{@render action({ stale })}</div>
	{/if}
</div>
