<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icon } from '$icons';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		title: string;
		description?: string;
		class?: string;
		action?: Snippet;
	};

	let { icon, title, description, class: className = '', action }: Props = $props();
</script>

<div
	class={cn(
		'text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center',
		className
	)}
>
	{#if icon}
		<div
			class="bg-muted text-subtle-foreground inline-flex h-12 w-12 items-center justify-center rounded-full"
		>
			<Icon {icon} size="lg" />
		</div>
	{/if}
	<div class="stack stack-tight">
		<h2 class="h6 text-foreground">{title}</h2>
		{#if description}<p class="body-sm">{description}</p>{/if}
	</div>
	{#if action}{@render action()}{/if}
</div>
