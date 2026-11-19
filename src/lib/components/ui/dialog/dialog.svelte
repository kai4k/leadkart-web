<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	/**
	 * `busy`: a save is in flight. Escape, outside click and every Close refuse to close the dialog
	 * (the veto sits here, not in each dialog), so the failure always lands where the user can see it.
	 * bits-ui calls `onOpenChange` even for a refused change, so the veto covers both paths.
	 */
	let {
		open = $bindable(false),
		busy = false,
		onOpenChange,
		...rest
	}: DialogPrimitive.RootProps & { busy?: boolean } = $props();
</script>

<DialogPrimitive.Root
	bind:open={() => open, (next) => (open = next || busy)}
	onOpenChange={(next) => {
		if (next || !busy) onOpenChange?.(next);
	}}
	{...rest}
/>
