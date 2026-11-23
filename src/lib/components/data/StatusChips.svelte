<script lang="ts">
	/**
	 * StatusChips — a row of single-choice chips over one list (tenant status, member status), with
	 * "All" as the way back. One chip is on at most; pressing the chip that is on turns it off, which
	 * is "All" again. `count` is shown when the page knows it.
	 */
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.ts';

	type Option = { value: string; label: string; count?: number };
	type Props = {
		/** The group's accessible name. */
		label: string;
		options: Option[];
		/** The chip that is on; `null` is All. */
		value: string | null;
		onChange: (value: string | null) => void;
		allLabel?: string;
	};
	let { label, options, value, onChange, allLabel = 'All' }: Props = $props();

	// bits-ui's single group reports '' for "nothing on".
	const ALL = '';
	const current = $derived(value ?? ALL);

	function change(next: string | undefined): void {
		const normalised = next === undefined || next === ALL ? null : next;
		if (normalised !== value) onChange(normalised);
	}
</script>

<ToggleGroup.Root
	type="single"
	variant="outline"
	size="sm"
	spacing={1}
	aria-label={label}
	value={current}
	onValueChange={change}
	class="flex-wrap"
>
	<ToggleGroup.Item value={ALL} aria-label={allLabel}>{allLabel}</ToggleGroup.Item>
	{#each options as option (option.value)}
		<ToggleGroup.Item value={option.value}>
			{option.label}
			{#if option.count !== undefined}
				<span class="text-muted-foreground tabular-nums">{option.count}</span>
			{/if}
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>
