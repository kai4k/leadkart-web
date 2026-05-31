<script lang="ts">
	import { Tooltip as TooltipPrimitive } from 'bits-ui';
	let { delayDuration = 200, ...rest }: TooltipPrimitive.ProviderProps = $props();
</script>

<TooltipPrimitive.Provider {delayDuration} {...rest} />
