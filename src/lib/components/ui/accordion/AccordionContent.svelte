<!-- src/lib/components/ui/accordion/AccordionContent.svelte -->
<!--
	AccordionContent — the disclosed region.

	bits-ui exposes `data-[state=open|closed]` on the content element.
	A CSS-only collapse animation hooks into those states + the
	`--bits-accordion-content-height` CSS variable bits-ui writes to
	the element for transition height interpolation.
-->
<script lang="ts">
	import { Accordion as BitsAccordion } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		class?: string;
		children: Snippet;
	};

	let { class: className = '', children }: Props = $props();
</script>

<BitsAccordion.Content
	class={cn(
		'body-sm text-fg-muted overflow-hidden',
		'data-[state=open]:animate-accordion-open data-[state=closed]:animate-accordion-close'
	)}
>
	<div class={cn('pb-4', className)}>
		{@render children()}
	</div>
</BitsAccordion.Content>

<!--
	Accordion height animation — bits-ui writes the measured content
	height to `--bits-accordion-content-height` on the element; the
	open/close keyframes interpolate from 0 to that height.

	Animation keyframes are an explicitly allowed `<style>` use per the
	primitives rule (Tailwind can't express animation-name + keyframes).
-->
<style>
	@keyframes accordion-open {
		from {
			height: 0;
		}
		to {
			height: var(--bits-accordion-content-height);
		}
	}
	@keyframes accordion-close {
		from {
			height: var(--bits-accordion-content-height);
		}
		to {
			height: 0;
		}
	}
	:global(.animate-accordion-open) {
		animation: accordion-open var(--duration-base) var(--ease-out);
	}
	:global(.animate-accordion-close) {
		animation: accordion-close var(--duration-fast) var(--ease-in);
	}
</style>
