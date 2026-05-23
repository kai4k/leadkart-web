<script lang="ts">
	import { Button, Badge } from '$ui';
	import { TextField, Select } from '$lib/components/form';
	import { Icon, Search, X } from '$icons';
	import {
		STAGE_OPTIONS,
		SOURCE_OPTIONS,
		sourceLabel,
		stageBadge
	} from '$features/leads/view-models';
	import type { LeadStage, LeadSource } from '$features/leads/schemas';

	type Props = {
		q: string;
		stages: LeadStage[];
		sources: LeadSource[];
		onQChange: (next: string) => void;
		onStagesChange: (next: LeadStage[]) => void;
		onSourcesChange: (next: LeadSource[]) => void;
		onClearAll: () => void;
	};

	let { q, stages, sources, onQChange, onStagesChange, onSourcesChange, onClearAll }: Props =
		$props();

	// Writable $derived — mirrors the upstream `q` prop but lets the
	// input write to it locally between debounced submits.
	let qLocal = $derived(q);
	let stagePick = $state<LeadStage | ''>('');
	let sourcePick = $state<LeadSource | ''>('');

	// Debounced submit on q — feel like Linear / Notion search.
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;
	function onQInput(value: string) {
		qLocal = value;
		if (debounceHandle) clearTimeout(debounceHandle);
		debounceHandle = setTimeout(() => onQChange(qLocal), 250);
	}

	function addStage(s: LeadStage | '') {
		if (!s || stages.includes(s)) return;
		onStagesChange([...stages, s]);
		stagePick = '';
	}
	function removeStage(s: LeadStage) {
		onStagesChange(stages.filter((x) => x !== s));
	}
	function addSource(s: LeadSource | '') {
		if (!s || sources.includes(s)) return;
		onSourcesChange([...sources, s]);
		sourcePick = '';
	}
	function removeSource(s: LeadSource) {
		onSourcesChange(sources.filter((x) => x !== s));
	}

	const hasAny = $derived(q.length > 0 || stages.length > 0 || sources.length > 0);
</script>

<div class="stack stack-tight">
	<div class="cluster cluster-spread gap-3">
		<div class="min-w-0 flex-1">
			<TextField
				label="Search leads"
				srLabel
				name="q"
				placeholder="Search by name, email, phone, company…"
				value={qLocal}
				oninput={(e) => onQInput((e.target as HTMLInputElement).value)}
			>
				{#snippet leading()}
					<Icon icon={Search} size="sm" />
				{/snippet}
			</TextField>
		</div>
		<div class="cluster cluster-tight" style="min-width: 200px;">
			<Select
				label="Stage filter"
				srLabel
				placeholder="Filter stage…"
				bind:value={stagePick}
				onchange={() => addStage(stagePick)}
				options={STAGE_OPTIONS.filter((o) => !stages.includes(o.value))}
			/>
		</div>
		<div class="cluster cluster-tight" style="min-width: 200px;">
			<Select
				label="Source filter"
				srLabel
				placeholder="Filter source…"
				bind:value={sourcePick}
				onchange={() => addSource(sourcePick)}
				options={SOURCE_OPTIONS.filter((o) => !sources.includes(o.value))}
			/>
		</div>
	</div>

	{#if hasAny}
		<div class="cluster cluster-tight flex-wrap" data-testid="filter-chips">
			{#each stages as s (s)}
				{@const meta = stageBadge(s)}
				<button
					type="button"
					class="focus-visible:ring-focus-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
					onclick={() => removeStage(s)}
					aria-label={`Remove stage ${meta.label}`}
				>
					<Badge variant={meta.variant} style="soft" size="sm">
						{meta.label} <span aria-hidden="true" class="ml-1 inline-flex">×</span>
					</Badge>
				</button>
			{/each}
			{#each sources as s (s)}
				<button
					type="button"
					class="focus-visible:ring-focus-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
					onclick={() => removeSource(s)}
					aria-label={`Remove source ${sourceLabel(s)}`}
				>
					<Badge variant="neutral" style="outline" size="sm">
						{sourceLabel(s)} <span aria-hidden="true" class="ml-1 inline-flex">×</span>
					</Badge>
				</button>
			{/each}
			{#if q.length > 0}
				<button
					type="button"
					class="focus-visible:ring-focus-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
					onclick={() => {
						qLocal = '';
						onQChange('');
					}}
					aria-label="Clear search"
				>
					<Badge variant="info" style="soft" size="sm">
						"{q}" <span aria-hidden="true" class="ml-1 inline-flex">×</span>
					</Badge>
				</button>
			{/if}
			<Button variant="ghost" size="sm" onclick={onClearAll}>
				<Icon icon={X} size="xs" /> Clear all
			</Button>
		</div>
	{/if}
</div>
