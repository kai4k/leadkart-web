<script lang="ts" module>
	export type StepperState = 'pending' | 'current' | 'complete' | 'error';
</script>

<script lang="ts">
	import { Check, AlertTriangle } from '$icons';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		index: number;
		label: string;
		state: StepperState;
		optional?: boolean;
		/** Whether this step is the last — suppresses the connector line. */
		last?: boolean;
		class?: string;
	};

	let {
		index,
		label,
		state,
		optional = false,
		last = false,
		class: className = ''
	}: Props = $props();

	const indicatorClass = $derived.by(() => {
		switch (state) {
			case 'complete':
				return 'bg-primary text-primary-foreground border-primary';
			case 'current':
				return 'bg-primary-soft text-primary-text border-primary';
			case 'error':
				return 'bg-destructive-soft text-destructive border-destructive';
			case 'pending':
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	});

	const labelClass = $derived.by(() => {
		switch (state) {
			case 'current':
				return 'text-foreground font-semibold';
			case 'complete':
				return 'text-foreground';
			case 'error':
				return 'text-destructive font-medium';
			case 'pending':
			default:
				return 'text-muted-foreground';
		}
	});

	const connectorClass = $derived.by(() => {
		// Connector segment painted to the right of this step; shows progress.
		if (state === 'complete') return 'bg-primary';
		return 'bg-border';
	});
</script>

<li
	class={cn('relative flex flex-1 flex-col items-center', className)}
	aria-current={state === 'current' ? 'step' : undefined}
>
	{#if !last}
		<span
			class={cn(
				'absolute top-4 right-[calc(-50%+1rem)] left-[calc(50%+1rem)] h-0.5',
				connectorClass
			)}
			aria-hidden="true"
		></span>
	{/if}

	<span
		class={cn(
			'relative z-[1] inline-flex h-8 w-8 items-center justify-center rounded-full border-2',
			'caption font-semibold tabular-nums',
			indicatorClass
		)}
	>
		{#if state === 'complete'}
			<Check size={16} aria-hidden="true" />
		{:else if state === 'error'}
			<AlertTriangle size={16} aria-hidden="true" />
		{:else}
			{index}
		{/if}
	</span>

	<div class="stack stack-tight mt-2 max-w-full text-center">
		<span class={cn('body-sm truncate-1', labelClass)}>{label}</span>
		{#if optional}
			<span class="caption text-subtle-foreground">Optional</span>
		{/if}
	</div>
</li>
