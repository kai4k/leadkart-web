<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X as XIcon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
	import DialogOverlay from './dialog-overlay.svelte';
	import DialogPortal from './dialog-portal.svelte';
	import type { Snippet, ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		closeLabel,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
		/** Accessible name of the built-in X (English by default; pass a translated string). */
		closeLabel?: string;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-border flex max-h-[90vh] max-w-[calc(100%_-_2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 text-sm shadow-lg ring-1 duration-100 sm:max-w-lg fixed top-1/2 left-1/2 z-(--z-modal) w-full -translate-x-1/2 -translate-y-1/2 outline-none',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-3 end-3" size="icon-sm" {...props}>
						<XIcon />
						<span class="sr-only">{closeLabel ?? $_('common.close')}</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
