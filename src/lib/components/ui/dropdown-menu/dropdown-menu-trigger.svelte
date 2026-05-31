<script lang="ts">
	import type { Snippet } from 'svelte';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import Button from '../button/button.svelte';
	import type { ButtonVariant, ButtonSize } from '../button/button.svelte';

	/**
	 * Dropdown.Trigger — bits-ui primitive wrapped to absorb the
	 * Button atom (asChild canon).
	 *
	 * Why: default bits-ui Trigger renders its own `<button>`. Wrapping
	 * a `<Button>` inside would produce `<button><button>` →
	 * axe-core `nested-interactive` WCAG 4.1.2 violation. The bits-ui v2
	 * canon escape is the `child` snippet — it lets the consumer's element
	 * receive the trigger's merged props (data-state, aria-expanded,
	 * aria-haspopup, onclick, keyboard handlers) instead of being wrapped.
	 *
	 * Two modes (the atom decides at render-time):
	 *
	 *   1. variant supplied → render the project's `<Button>` atom via
	 *      `child` snippet. Consumer writes:
	 *
	 *        <Dropdown.Trigger variant="ghost" size="sm" aria-label="...">
	 *          <Icon icon={MoreVertical} />
	 *        </Dropdown.Trigger>
	 *
	 *   2. variant absent → render bits-ui's bare `<button>` (consumer
	 *      supplies their own class, e.g. StatusPill, UserMenu avatar).
	 *
	 * This is the shadcn-svelte / Radix `asChild` pattern surfaced as
	 * a uniform atom API so consumers never write the `child` snippet.
	 */

	type Props = Omit<DropdownMenuPrimitive.TriggerProps, 'children' | 'child'> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		fullWidth?: boolean;
		loading?: boolean;
		children?: Snippet;
	};

	let {
		ref = $bindable(null),
		variant,
		size,
		fullWidth,
		loading,
		children,
		...rest
	}: Props = $props();

	const renderAsButton = $derived(variant !== undefined);
</script>

{#if renderAsButton}
	<DropdownMenuPrimitive.Trigger bind:ref data-slot="dropdown-menu-trigger" {...rest}>
		{#snippet child({ props })}
			<Button {...props} {variant} {size} {fullWidth} {loading}>
				{@render children?.()}
			</Button>
		{/snippet}
	</DropdownMenuPrimitive.Trigger>
{:else}
	<DropdownMenuPrimitive.Trigger bind:ref data-slot="dropdown-menu-trigger" {...rest}>
		{@render children?.()}
	</DropdownMenuPrimitive.Trigger>
{/if}
