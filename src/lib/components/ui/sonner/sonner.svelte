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
	closeButton
	style="--normal-text: var(--popover-foreground); --normal-border: transparent;"
	toastOptions={{
		classes: {
			toast:
				// the neutral toast is the pane material (sonner paints its own background unlayered, so the `!`). svelte-sonner
				// renders data-type="default" on every untyped toast (and "loading" on a pending one), so those are the
				// neutral types; a typed toast keeps its opaque soft fill below
				'data-[type=default]:material-pane! data-[type=loading]:material-pane! text-popover-foreground rounded-xl group toast',
			description: 'group-[.toast]:text-muted-foreground',
			actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
			cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
			// Typed toasts: the soft status fill, a full-strength status border and a status icon, all
			// tokens (sonner's own `richColors` palette ignores the primary colour and dark mode, and
			// no gate can see it). `!` beats sonner's unlayered per-toast background.
			success: 'bg-success-soft! border-success! text-foreground!',
			error: 'bg-destructive-soft! border-destructive! text-foreground!',
			warning: 'bg-warning-soft! border-warning! text-foreground!',
			info: 'bg-info-soft! border-info! text-foreground!'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2 class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheck class="size-4 text-success" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonX class="size-4 text-destructive" />
	{/snippet}
	{#snippet infoIcon()}
		<Info class="size-4 text-info" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlert class="size-4 text-warning" />
	{/snippet}
</Sonner>
