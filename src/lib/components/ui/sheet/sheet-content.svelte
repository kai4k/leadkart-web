<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export type Side = 'top' | 'right' | 'bottom' | 'left';

	/**
	 * Width of a left / right sheet from `sm` up (below it the sheet is 3/4 of the viewport):
	 * sm 24rem, md 32rem, lg 40rem (default, what the drawer was before Phase 2).
	 */
	export const sheetSizes = cva('', {
		variants: {
			size: {
				sm: 'data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
				md: 'data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg',
				lg: 'data-[side=left]:sm:max-w-160 data-[side=right]:sm:max-w-160'
			}
		},
		defaultVariants: { size: 'lg' }
	});
	export type SheetSize = NonNullable<VariantProps<typeof sheetSizes>['size']>;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Dialog as SheetPrimitive } from 'bits-ui';
	import { X as XIcon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
	import { assertOverlayName } from '../overlay-name.ts';
	import SheetHeader from './sheet-header.svelte';
	import SheetTitle from './sheet-title.svelte';
	import SheetOverlay from './sheet-overlay.svelte';
	import SheetPortal from './sheet-portal.svelte';
	import type { Snippet, ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		side = 'right',
		size = 'lg',
		title,
		titleHidden = false,
		showCloseButton = true,
		closeLabel,
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SheetPortal>>;
		side?: Side;
		size?: SheetSize;
		/**
		 * The sheet's accessible name, rendered as the Title part. A sheet needs a name: pass this,
		 * render a `Sheet.Title` yourself, or set `aria-label` (a dev-time error otherwise).
		 */
		title?: string;
		/** Visually hide `title` (it stays the accessible name). */
		titleHidden?: boolean;
		showCloseButton?: boolean;
		/** Accessible name of the built-in X; the default is the localised `common.close`. */
		closeLabel?: string;
		children: Snippet;
	} = $props();

	$effect(() => {
		void assertOverlayName(ref, 'Sheet');
	});
</script>

<SheetPortal {...portalProps}>
	<SheetOverlay />
	<SheetPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		data-side={side}
		class={cn(
			'bg-popover text-popover-foreground fixed z-(--z-modal) flex flex-col gap-0 bg-clip-padding text-sm shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:start-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-e data-[side=right]:inset-y-0 data-[side=right]:end-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-s data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10 rtl:data-[side=left]:data-open:slide-in-from-right-10 rtl:data-[side=right]:data-open:slide-in-from-left-10 rtl:data-[side=left]:data-closed:slide-out-to-right-10 rtl:data-[side=right]:data-closed:slide-out-to-left-10',
			sheetSizes({ size }),
			className
		)}
		{...restProps}
	>
		{#if title && titleHidden}
			<SheetTitle class="sr-only">{title}</SheetTitle>
		{:else if title}
			<SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
		{/if}
		{@render children?.()}
		{#if showCloseButton}
			<SheetPrimitive.Close data-slot="sheet-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-3 end-3" size="icon-sm" {...props}>
						<XIcon />
						<span class="sr-only">{closeLabel ?? $_('common.close')}</span>
					</Button>
				{/snippet}
			</SheetPrimitive.Close>
		{/if}
	</SheetPrimitive.Content>
</SheetPortal>
