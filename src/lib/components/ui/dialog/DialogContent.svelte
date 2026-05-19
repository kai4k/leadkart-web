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
		class="is-fixed-overlay--overlay animate-fade-in bg-overlay inset-0 backdrop-blur-sm"
	/>
	<BitsDialog.Content
		class={cn(
			'glass-card is-fixed-overlay--modal top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
			'flex w-full max-w-lg flex-col',
			'rounded-xl border border-[var(--glass-border-subtle)]',
			'animate-pop-in',
			className
		)}
	>
		{@render children()}
	</BitsDialog.Content>
</BitsDialog.Portal>
