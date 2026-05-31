<script lang="ts">
	import * as FormPrimitive from 'formsnap';
	let { ...rest }: FormPrimitive.ControlProps = $props();
</script>

<FormPrimitive.Control {...rest} />
