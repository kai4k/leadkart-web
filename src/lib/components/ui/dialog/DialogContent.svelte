<!-- src/lib/components/ui/dialog/DialogContent.svelte -->
<!--
	DialogContent — centered modal panel.

	Positioning note: .glass-card declares `position: relative` (to anchor
	its ::before inner-gradient pseudo-element). The inline `position: fixed`
	style overrides this so the panel stays in its fixed viewport position.
	Without it the dialog falls into normal document flow.
-->
<script lang="ts">
	import { Dialog as BitsDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<BitsDialog.Portal>
	<BitsDialog.Overlay
		class="animate-fade-in fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm"
		style="z-index: var(--z-overlay);"
	/>
	<BitsDialog.Content
		class={cn(
			'glass-card fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
			'flex w-full max-w-lg flex-col',
			'rounded-xl border border-[var(--glass-border-subtle)]',
			'animate-pop-in',
			className
		)}
		style="z-index: var(--z-modal); position: fixed;"
	>
		{@render children()}
	</BitsDialog.Content>
</BitsDialog.Portal>
