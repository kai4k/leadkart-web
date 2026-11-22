<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { createBusyVeto } from '#lib/hooks/use-busy-veto.svelte.ts';
	/**
	 * Local edit (ui/CUSTOMIZATIONS.md): `busy`. A confirmation whose action is in flight refuses to close
	 * (Escape, Cancel, every Close): the result lands where the user can see it. Same bounded veto as Dialog and
	 * Sheet (`createBusyVeto`): past the client read timeout of continuous `busy` the user can leave, with one
	 * neutral "couldn't confirm" line. bits-ui calls `onOpenChange` even for a refused change, so the veto covers both.
	 */
	let {
		open = $bindable(false),
		busy = false,
		onOpenChange,
		...restProps
	}: AlertDialogPrimitive.RootProps & { busy?: boolean } = $props();

	const veto = createBusyVeto(() => busy);
</script>

<AlertDialogPrimitive.Root
	bind:open={() => open, (next) => (open = next || veto.holding)}
	onOpenChange={(next) => {
		if (next || !veto.holding) {
			if (!next) veto.dismiss();
			onOpenChange?.(next);
		}
	}}
	{...restProps}
/>
