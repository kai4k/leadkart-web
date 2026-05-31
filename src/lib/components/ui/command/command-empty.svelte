<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	let { ref = $bindable(null), ...rest }: CommandPrimitive.EmptyProps = $props();
</script>

<CommandPrimitive.Empty
	bind:ref
	data-slot="command-empty"
	class="py-6 text-center text-sm text-fg-muted"
	{...rest}
/>
