<script lang="ts">
	import { AspectRatio as AspectRatioPrimitive } from 'bits-ui';
	let { ratio = 1, ...rest }: AspectRatioPrimitive.RootProps = $props();
</script>

<AspectRatioPrimitive.Root {ratio} data-slot="aspect-ratio" {...rest} />
