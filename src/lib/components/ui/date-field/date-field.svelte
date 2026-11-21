<script lang="ts">
	import { DateField as DateFieldPrimitive } from 'bits-ui';

	/**
	 * LeadKart composite (no shadcn registry entry): the bits-ui DateField root, unchanged. It draws nothing; the
	 * label, the input group and any calendar button are its children and share one `value` and one `placeholder`.
	 */
	let {
		value = $bindable(),
		placeholder = $bindable(),
		...restProps
	}: DateFieldPrimitive.RootProps = $props();
</script>

<DateFieldPrimitive.Root bind:value bind:placeholder {...restProps} />
