<script lang="ts">
	/**
	 * LeadProfileCard — pharma-side profile: business type, medicine
	 * system, product ranges (chips), dosage forms (chips), order value
	 * band, buy timeline.
	 */
	import { Card, Badge } from '$ui';
	import { Icon, Package } from '$icons';
	import type { CrmLeadDto } from '../schemas';
	import {
		BUSINESS_TYPE_LABEL,
		BUY_TIMELINE_LABEL,
		MEDICINE_SYSTEM_LABEL,
		ORDER_VALUE_BAND_LABEL
	} from '../view-models';

	type Props = { lead: CrmLeadDto };
	let { lead }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<div class="cluster cluster-tight">
			<Icon icon={Package} size="sm" />
			<h3 class="h5">Profile</h3>
		</div>
	</Card.Header>
	<Card.Content>
		<dl class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Business type</dt>
				<dd class="label text-fg">{BUSINESS_TYPE_LABEL[lead.business_type]}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Medicine system</dt>
				<dd class="label text-fg">{MEDICINE_SYSTEM_LABEL[lead.medicine_system]}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Order value band</dt>
				<dd class="label text-fg">{ORDER_VALUE_BAND_LABEL[lead.order_value_band]}</dd>
			</div>
			<div class="stack stack-tight">
				<dt class="caption text-fg-muted">Buy timeline</dt>
				<dd class="label text-fg">{BUY_TIMELINE_LABEL[lead.buy_timeline]}</dd>
			</div>

			<div class="stack stack-tight md:col-span-2">
				<dt class="caption text-fg-muted">Product ranges</dt>
				<dd class="cluster cluster-tight flex-wrap">
					{#each lead.product_ranges as range (range)}
						<Badge variant="brand" appearance="soft" size="sm">{range}</Badge>
					{:else}
						<span class="caption text-fg-subtle">—</span>
					{/each}
				</dd>
			</div>

			<div class="stack stack-tight md:col-span-2">
				<dt class="caption text-fg-muted">Dosage forms</dt>
				<dd class="cluster cluster-tight flex-wrap">
					{#each lead.dosage_forms as form (form)}
						<Badge variant="neutral" appearance="soft" size="sm">{form}</Badge>
					{:else}
						<span class="caption text-fg-subtle">—</span>
					{/each}
				</dd>
			</div>
		</dl>
	</Card.Content>
</Card.Root>
