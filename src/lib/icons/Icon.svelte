<script lang="ts" module>
	export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

	const SIZE_PX: Record<IconSize, number> = {
		xs: 14,
		sm: 16,
		md: 20,
		lg: 24,
		xl: 32
	};

	export function iconSize(size: IconSize): number {
		return SIZE_PX[size];
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	/**
	 * Icon wrapper consumes the icon-size design tokens and passes
	 * them to the underlying lucide-svelte (or any) icon component.
	 *
	 * The `icon` prop is typed `any` because lucide-svelte's component
	 * type doesn't match Svelte 5's `Component` type cleanly (mixed
	 * legacy + runes export shape). The structural contract — accepts
	 * `size: number` + `class: string` + aria-* — IS upheld by every
	 * lucide icon and any future swap (heroicons-svelte, phosphor-
	 * svelte). Type-safety here would need a custom IconComponent
	 * type that doesn't add value over the structural guarantee.
	 */
	type Props = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		size?: IconSize;
		class?: string;
		label?: string;
	};

	let { icon: IconComponent, size = 'md', class: className = '', label }: Props = $props();

	const px = $derived(iconSize(size));
	const hidden = $derived(label ? undefined : 'true');
</script>

<IconComponent
	size={px}
	class={cn('shrink-0', className)}
	aria-label={label}
	aria-hidden={hidden}
/>
