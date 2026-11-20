<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils/cn.ts';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		size?: number;
	};
	let { size = 16, class: className = '', ...rest }: Props = $props();
</script>

<span
	role="status"
	aria-label={$_('common.loading')}
	style="width: {size}px; height: {size}px;"
	class={cn(
		'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
		className
	)}
	{...rest}
></span>
