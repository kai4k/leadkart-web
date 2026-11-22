<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { createBusyVeto } from '#lib/hooks/use-busy-veto.svelte.ts';
	/**
	 * `busy`: a save is in flight. Escape, outside click and every Close refuse to close the sheet
	 * (the veto sits here, not in each dialog), so the failure always lands where the user can see it.
	 * bits-ui calls `onOpenChange` even for a refused change, so the veto covers both paths.
	 * The veto is bounded (see `createBusyVeto`): past the client read timeout of continuous `busy`
	 * the user can leave, with one neutral "couldn't confirm" line.
	 * `hold`: the surface has unsaved input. While it returns true every way out (Escape, outside click, every
	 * Close) is refused and `onHeld` is called once per attempt, so the caller can ask "Discard changes?"; the busy
	 * veto wins over it. A close the caller makes itself (`open = false`) is never held.
	 */
	let {
		open = $bindable(false),
		busy = false,
		hold,
		onHeld,
		onOpenChange,
		...rest
	}: DialogPrimitive.RootProps & {
		busy?: boolean;
		hold?: () => boolean;
		onHeld?: () => void;
	} = $props();

	const veto = createBusyVeto(() => busy);
</script>

<DialogPrimitive.Root
	bind:open={() => open, (next) => (open = next || veto.holding || (hold?.() ?? false))}
	onOpenChange={(next) => {
		if (next) return onOpenChange?.(next);
		if (veto.holding) return;
		if (hold?.()) return onHeld?.();
		veto.dismiss();
		onOpenChange?.(next);
	}}
	{...rest}
/>
