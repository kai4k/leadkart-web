<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	/**
	 * Width from `sm` up (below it every dialog is the viewport minus 2rem). Named sizes instead of
	 * call-site `max-w-*` overrides: sm 24rem, md 32rem (default), lg 48rem, xl 64rem.
	 */
	export const dialogSizes = cva('', {
		variants: {
			size: {
				sm: 'sm:max-w-sm',
				md: 'sm:max-w-lg',
				lg: 'sm:max-w-3xl',
				xl: 'sm:max-w-5xl'
			}
		},
		defaultVariants: { size: 'md' }
	});
	export type DialogSize = NonNullable<VariantProps<typeof dialogSizes>['size']>;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X as XIcon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
	import { assertOverlayName } from '../overlay-name.ts';
	import DialogHeader from './dialog-header.svelte';
	import DialogOverlay from './dialog-overlay.svelte';
	import DialogPortal from './dialog-portal.svelte';
	import DialogTitle from './dialog-title.svelte';
	import type { Snippet, ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		size = 'md',
		title,
		titleHidden = false,
		portalProps,
		children,
		showCloseButton = true,
		closeLabel,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		size?: DialogSize;
		/**
		 * The dialog's accessible name, rendered as the Title part. A dialog needs a name: pass
		 * this, render a `Dialog.Title` yourself, or set `aria-label` (a dev-time error otherwise).
		 */
		title?: string;
		/** Visually hide `title` (it stays the accessible name). */
		titleHidden?: boolean;
		showCloseButton?: boolean;
		/** Accessible name of the built-in X; the default is the localised `common.close`. */
		closeLabel?: string;
	} = $props();

	$effect(() => {
		void assertOverlayName(ref, 'Dialog');
	});
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'material-milk text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95  flex max-h-[90vh] max-w-[calc(100%_-_2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 text-sm   duration-100 fixed top-1/2 left-1/2 z-(--z-modal) w-full -translate-x-1/2 -translate-y-1/2 outline-none',
			dialogSizes({ size }),
			className
		)}
		{...restProps}
	>
		{#if title && titleHidden}
			<DialogTitle class="sr-only">{title}</DialogTitle>
		{:else if title}
			<DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
		{/if}
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
