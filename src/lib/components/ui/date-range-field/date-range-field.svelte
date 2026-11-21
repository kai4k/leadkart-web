<script lang="ts">
	import { DateRangeField as DateRangeFieldPrimitive } from 'bits-ui';

	/** LeadKart composite (no shadcn registry entry): the bits-ui DateRangeField root, unchanged. Draws nothing. */
	let {
		value = $bindable(),
		placeholder = $bindable(),
		...restProps
	}: DateRangeFieldPrimitive.RootProps = $props();
</script>

<DateRangeFieldPrimitive.Root bind:value bind:placeholder {...restProps} />
