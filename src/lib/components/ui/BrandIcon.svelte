<script lang="ts">
	/**
	 * The large app icon for the auth brand panel: the brand pebble (`AppPebble`, the one pebble
	 * implementation) with the full LK mark, sized by the caller's class (`size-20`). Decorative: the
	 * heading beside it names the product. It follows the palette, the mode and the transparency
	 * preferences through the pebble's tokens; there is nothing of its own to keep in sync.
	 */
	import AppPebble from './AppPebble.svelte';

	let { class: className }: { class?: string } = $props();
</script>

<AppPebble size="lg" class={className} data-brand-icon />
