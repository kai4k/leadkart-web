<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	type SingleProps = Extract<SelectPrimitive.RootProps, { type?: 'single' }>;
	let { open = $bindable(false), type: _type, ...rest }: SingleProps = $props();
</script>

<SelectPrimitive.Root type="single" bind:open {...rest} />
