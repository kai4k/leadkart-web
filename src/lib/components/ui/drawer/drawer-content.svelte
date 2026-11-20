<script lang="ts">
	import * as Sheet from '../sheet/index.ts';
	import { getDrawerConfig } from './context.ts';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		side,
		showCloseButton = false,
		children,
		...rest
	}: ComponentProps<typeof Sheet.Content> = $props();

	const config = getDrawerConfig();
</script>

<Sheet.Content
	bind:ref
	side={side ?? config?.side ?? 'right'}
	{showCloseButton}
	escapeKeydownBehavior={config?.dismissible === false ? 'ignore' : 'close'}
	interactOutsideBehavior={config?.dismissible === false ? 'ignore' : 'close'}
	{...rest}
>
	{@render children?.()}
</Sheet.Content>
