<script lang="ts">
	import type { Snippet, Component } from 'svelte';
	import { Icon } from '$icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		icon?: Component;
		title: string;
		description?: string;
		class?: string;
		action?: Snippet;
	};

	let { icon, title, description, class: className = '', action }: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center gap-3 py-12 text-center text-[var(--color-fg-muted)]',
		className
	)}
>
	{#if icon}
		<div
			class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-fg-subtle)]"
		>
			<Icon {icon} size="lg" />
		</div>
	{/if}
	<div class="stack stack-tight">
		<h3 class="h6 text-[var(--color-fg)]">{title}</h3>
		{#if description}<p class="body-sm">{description}</p>{/if}
	</div>
	{#if action}{@render action()}{/if}
</div>
