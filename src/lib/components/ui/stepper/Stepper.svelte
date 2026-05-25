<script lang="ts">
	/**
	 * Stepper — horizontal step indicator.
	 *
	 * Renders an `<ol>` with role="list" of step indicators connected by
	 * line segments. Each child is a StepperStep handling its own state.
	 *
	 * Industry refs: Stripe Checkout wizard, Material 3 Stepper, GitHub
	 * onboarding flow, GOV.UK task list.
	 */
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		ariaLabel?: string;
		class?: string;
		children: Snippet;
	};

	let { ariaLabel = 'Progress', class: className = '', children }: Props = $props();
</script>

<ol class={cn('flex w-full items-start justify-between gap-2', className)} aria-label={ariaLabel}>
	{@render children()}
</ol>
