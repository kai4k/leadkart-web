<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { createBusyVeto } from '#lib/hooks/use-busy-veto.svelte.ts';
	/**
	 * `busy`: a save is in flight. Escape, outside click and every Close refuse to close the dialog
	 * (the veto sits here, not in each dialog), so the failure always lands where the user can see it.
	 * bits-ui calls `onOpenChange` even for a refused change, so the veto covers both paths.
	 * The veto is bounded (see `createBusyVeto`): past the client read timeout of continuous `busy`
	 * the user can leave, with one neutral "couldn't confirm" line.
	 */
	let {
		open = $bindable(false),
		busy = false,
		onOpenChange,
		...rest
	}: DialogPrimitive.RootProps & { busy?: boolean } = $props();

	const veto = createBusyVeto(() => busy);
</script>

<DialogPrimitive.Root
	bind:open={() => open, (next) => (open = next || veto.holding)}
	onOpenChange={(next) => {
		if (next || !veto.holding) {
			if (!next) veto.dismiss();
			onOpenChange?.(next);
		}
	}}
	{...rest}
/>
