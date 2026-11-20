<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from '#lib/icons/index.ts';

	/**
	 * Toaster (svelte-sonner). Mounted ONCE in the root layout, which passes `theme` from the
	 * preferences store (`auto` is sonner's `system`; `black-white` is the light palette under
	 * the root grayscale filter). This primitive does not read the store: ui/ stays below features/.
	 */
	let { theme = 'system', ...restProps }: SonnerProps = $props();
</script>

<Sonner
	{theme}
	class="toaster group"
	position="bottom-right"
	richColors
	closeButton
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
	toastOptions={{
		classes: {
			toast:
				'bg-popover text-popover-foreground border border-border rounded-md shadow-lg group toast',
			description: 'group-[.toast]:text-muted-foreground',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
			cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2 class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheck class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonX class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<Info class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlert class="size-4" />
	{/snippet}
</Sonner>
