<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
	let { open = $bindable(false), ...rest }: CollapsiblePrimitive.RootProps = $props();
</script>

<CollapsiblePrimitive.Root bind:open data-slot="collapsible" {...rest} />
