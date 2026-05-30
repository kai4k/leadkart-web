<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	let { ...rest }: AccordionPrimitive.RootProps = $props();
</script>

<AccordionPrimitive.Root data-slot="accordion" {...rest} />
