<!-- src/lib/components/data/FilterChips.svelte -->
<script lang="ts" generics="TFilters extends import('$lib/hooks').UrlFiltersBase">
	import type { UseUrlFilters } from '$lib/hooks';
	import { Icon, X } from '$icons';
	import { cn } from '$lib/utils/cn';

	/**
	 * FilterChips — horizontal flex of removable chips, one per active
	 * filter value. Multi-value filters expand to one chip per value
	 * so each is independently removable.
	 *
	 * Pure projection of `urlFilters.activeChips`; no state of its own.
	 */
	type Props = {
		urlFilters: UseUrlFilters<TFilters>;
		class?: string;
	};

	let { urlFilters, class: className = '' }: Props = $props();
</script>

{#if urlFilters.activeChips.length > 0}
	<div class={cn('cluster cluster-tight items-center', className)}>
		{#each urlFilters.activeChips as chip (`${chip.key}:${chip.value}`)}
			<span
				class={cn(
					'cluster cluster-tight items-center',
					'bg-bg-muted text-fg label rounded-full px-3 py-1'
				)}
			>
				<span class="caption text-fg-muted">{chip.label}:</span>
				<span class="label">{chip.value}</span>
				<button
					type="button"
					class="text-fg-muted hover:text-fg focus-visible:ring-focus-ring -mr-1 inline-flex h-4 w-4 items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none"
					aria-label="Remove {chip.label} filter: {chip.value}"
					onclick={() => urlFilters.clearValue(chip.key as keyof TFilters & string, chip.value)}
				>
					<Icon icon={X} size="xs" />
				</button>
			</span>
		{/each}

		{#if urlFilters.activeChips.length >= 2}
			<button
				type="button"
				class="label text-fg-muted hover:text-fg ml-1 hover:underline"
				onclick={() => urlFilters.clearAll()}
			>
				Clear all
			</button>
		{/if}
	</div>
{/if}
