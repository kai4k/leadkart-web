<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	/** The one pebble: an app's icon, the brand's mark. Same shape and material everywhere it appears. */
	export const appPebbleVariants = cva(
		'material-pebble inline-grid shrink-0 place-items-center select-none',
		{
			variants: {
				size: { xs: 'size-6', sm: 'size-8', md: 'size-11', lg: 'size-14' }
			},
			defaultVariants: { size: 'md' }
		}
	);
	export type AppPebbleSize = NonNullable<VariantProps<typeof appPebbleVariants>['size']>;
</script>

<script lang="ts">
	/**
	 * An app pebble. With `app` the colour is that app's identity colour (the `.app-<key>` scope sets
	 * `--app-accent`, utilities.css); without it the pebble is the brand's (the `app-home` scope, even
	 * inside another app's page). The glyph is white (`--app-glyph`): the `icon` when one is given,
	 * else the brand mark. `label` names it; without one it is decorative (a neighbouring name says
	 * what it is).
	 *
	 * `BrandIcon` is this component with the mark, so there is one pebble implementation.
	 */
	import type { Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { AppKey } from '#lib/config/nav.ts';
	import Icon from '#lib/icons/Icon.svelte';
	import { cn } from '#lib/utils/cn.ts';
	import BrandMark from './BrandMark.svelte';

	type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label' | 'role'> & {
		app?: AppKey;
		/** a lucide icon (any Svelte component that takes a class) */
		icon?: Component<{ class?: string }>;
		size?: AppPebbleSize;
		label?: string;
	};

	let { app, icon, size = 'md', label, class: className, ...rest }: Props = $props();
</script>

<span
	{...rest}
	class={cn(appPebbleVariants({ size }), `app-${app ?? 'home'}`, className)}
	data-app-pebble
	data-app={app}
	data-size={size}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	{#if icon}
		<Icon {icon} class="size-1/2" />
	{:else}
		<!-- the large pebble carries the full drawing, the others the small one -->
		<BrandMark
			decorative
			tone="pebble"
			drawing={size === 'lg' ? 'full' : 'small'}
			class="size-[62%] [&>svg]:size-full"
		/>
	{/if}
</span>
