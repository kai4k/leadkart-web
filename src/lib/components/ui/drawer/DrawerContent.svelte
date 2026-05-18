<!-- src/lib/components/ui/drawer/DrawerContent.svelte -->
<!--
	DrawerContent — right-side slide-over panel.

	Positioning note: .glass-card declares `position: relative` (to anchor
	its ::before inner-gradient pseudo-element). The inline `position: fixed`
	style overrides this so the panel stays in its fixed viewport position.
	Without it the drawer falls into normal document flow.
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
		class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm"
		style="z-index: var(--z-overlay);"
	/>
	<BitsDialog.Content
		class={cn(
			'glass-card fixed inset-y-0 right-0 flex w-full max-w-md flex-col',
			'rounded-none border-0 border-l border-[var(--glass-border-subtle)]',
			'animate-slide-in-right',
			className
		)}
		style="z-index: var(--z-modal); position: fixed;"
	>
		{@render children()}
	</BitsDialog.Content>
</BitsDialog.Portal>
