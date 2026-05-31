<script lang="ts">
	import { Combobox as ComboboxPrimitive } from 'bits-ui';
	type SingleProps = Extract<ComboboxPrimitive.RootProps, { type?: 'single' }>;
	let {
		open = $bindable(false),
		value = $bindable(),
		type: _type,
		...rest
	}: SingleProps = $props();
</script>

<ComboboxPrimitive.Root type="single" bind:open bind:value {...rest} />
