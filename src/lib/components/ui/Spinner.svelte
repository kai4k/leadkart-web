<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type Props = {
		size?: number;
		class?: string;
		'aria-label'?: string;
		'aria-hidden'?: boolean | 'true' | 'false';
	};

	let {
		size = 20,
		class: className = '',
		'aria-label': ariaLabel,
		'aria-hidden': ariaHidden
	}: Props = $props();
</script>

<svg
	class={cn('animate-spin', className)}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	role={ariaHidden ? undefined : 'status'}
	aria-label={ariaHidden ? undefined : (ariaLabel ?? 'Loading')}
	aria-hidden={ariaHidden}
>
	<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"
	></circle>
	<path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round"
	></path>
</svg>

<style>
	@media (prefers-reduced-motion: reduce) {
		.animate-spin {
			animation: none;
		}
	}
</style>
