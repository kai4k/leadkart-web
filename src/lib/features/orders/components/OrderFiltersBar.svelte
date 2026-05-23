<script lang="ts">
	import { Button, Badge } from '$ui';
	import { TextField, Select } from '$lib/components/form';
	import { Icon, Search, X } from '$icons';
	import { orderStatusSchema, type OrderStatus } from '$features/orders/schemas';
	import { statusBadge } from '$features/orders/view-models';

	type Props = {
		q: string;
		statuses: OrderStatus[];
		onQChange: (next: string) => void;
		onStatusesChange: (next: OrderStatus[]) => void;
		onClearAll: () => void;
	};

	let { q, statuses, onQChange, onStatusesChange, onClearAll }: Props = $props();

	const STATUS_OPTIONS = orderStatusSchema.options.map((s) => ({
		value: s,
		label: statusBadge(s).label
	}));

	// Writable $derived — mirrors the upstream `q` prop but lets the
	// input write to it locally between debounced submits. Matches the
	// LeadFiltersBar pattern; avoids `state_referenced_locally` since
	// $derived re-runs when the prop changes.
	let qLocal = $derived(q);
	let statusPick = $state<OrderStatus | ''>('');

	let debounceHandle: ReturnType<typeof setTimeout> | null = null;
	function onQInput(value: string) {
		qLocal = value;
		if (debounceHandle) clearTimeout(debounceHandle);
		debounceHandle = setTimeout(() => onQChange(qLocal), 250);
	}

	function addStatus(s: OrderStatus | '') {
		if (!s || statuses.includes(s)) return;
		onStatusesChange([...statuses, s]);
		statusPick = '';
	}
	function removeStatus(s: OrderStatus) {
		onStatusesChange(statuses.filter((x) => x !== s));
	}

	const hasAny = $derived(q.length > 0 || statuses.length > 0);
</script>

<div class="stack stack-tight">
	<div class="cluster cluster-spread gap-3">
		<div class="min-w-0 flex-1">
			<TextField
				label="Search orders"
				srLabel
				name="q"
				placeholder="Search by order number or customer name…"
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
				label="Status filter"
				srLabel
				placeholder="Filter status…"
				bind:value={statusPick}
				onchange={() => addStatus(statusPick)}
				options={STATUS_OPTIONS.filter((o) => !statuses.includes(o.value))}
			/>
		</div>
	</div>

	{#if hasAny}
		<div class="cluster cluster-tight flex-wrap" data-testid="filter-chips">
			{#each statuses as s (s)}
				{@const meta = statusBadge(s)}
				<button
					type="button"
					class="focus-visible:ring-focus-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
					onclick={() => removeStatus(s)}
					aria-label={`Remove status ${meta.label}`}
					data-testid={`chip-status-${s}`}
				>
					<Badge variant={meta.variant} style="soft" size="sm">
						{meta.label} <span aria-hidden="true" class="ml-1 inline-flex">×</span>
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
