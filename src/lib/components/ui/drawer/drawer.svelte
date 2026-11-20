<script lang="ts">
	/**
	 * `busy`: a save is in flight, so Escape, outside click, drag and every Close are refused (vaul's
	 * `dismissible`, which vetoes at the root). The failure then lands where the user can see it.
	 * The veto is bounded (see `createBusyVeto`): past the client read timeout of continuous `busy`
	 * the user can leave, with one neutral "couldn't confirm" line.
	 */
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { createBusyVeto } from '#lib/hooks/use-busy-veto.svelte.ts';
	let {
		shouldScaleBackground = true,
		direction = 'right',
		open = $bindable(false),
		activeSnapPoint = $bindable(null),
		dismissible = true,
		busy = false,
		onOpenChange,
		...rest
	}: DrawerPrimitive.RootProps & { busy?: boolean } = $props();

	const veto = createBusyVeto(() => busy);
</script>

<DrawerPrimitive.Root
	{shouldScaleBackground}
	{direction}
	dismissible={dismissible && !veto.holding}
	bind:open
	bind:activeSnapPoint
	onOpenChange={(next) => {
		if (!next) veto.dismiss();
		onOpenChange?.(next);
	}}
	{...rest}
/>
