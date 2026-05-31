<script lang="ts">
	import { DatePicker as DatePickerPrimitive } from 'bits-ui';
	let {
		open = $bindable(false),
		value = $bindable(),
		placeholder = $bindable(),
		...rest
	}: DatePickerPrimitive.RootProps = $props();
</script>

<DatePickerPrimitive.Root bind:open bind:value bind:placeholder {...rest} />
