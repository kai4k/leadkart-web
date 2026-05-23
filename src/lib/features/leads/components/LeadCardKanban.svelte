<script lang="ts">
	/**
	 * LeadCardKanban — kanban card body for one lead.
	 *
	 * Composes the row data into the card surface that `<Kanban.Card>`
	 * wraps with the draggable container. Click on the card body
	 * navigates to detail; the surrounding li handles drag.
	 */
	import { goto } from '$app/navigation';
	import { Badge, StatusPill } from '$ui';
	import type { CrmLeadDto } from '../schemas';
	import {
		BUSINESS_TYPE_LABEL,
		ORDER_VALUE_BAND_LABEL,
		TEMPERATURE_OPTIONS,
		locationLabel,
		temperatureMeta
	} from '../view-models';

	type Props = {
		lead: CrmLeadDto;
		onTemperatureChange?: (temperature: CrmLeadDto['temperature']) => void;
	};

	let { lead, onTemperatureChange }: Props = $props();

	const tempVariant = $derived(temperatureMeta(lead.temperature).variant);

	function open() {
		goto(`/leads/${lead.id}`);
	}
</script>

<!-- Non-button click target inside a draggable li — pointer + role handle that.
     The kanban Card primitive owns drag and a11y; this is purely visual. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stack stack-tight" onclick={open} data-testid="lead-kanban-card" data-lead-id={lead.id}>
	<div class="cluster cluster-spread items-start">
		<span class="label text-fg truncate font-semibold">{lead.contact_name}</span>
		<StatusPill
			value={lead.temperature}
			options={onTemperatureChange ? [...TEMPERATURE_OPTIONS] : undefined}
			onChange={(v) => onTemperatureChange?.(v as CrmLeadDto['temperature'])}
		/>
	</div>

	<p class="caption text-fg-muted truncate">{lead.mobile_number}</p>
	<p class="caption text-fg-muted truncate">{locationLabel(lead)}</p>

	<div class="cluster cluster-tight">
		<Badge variant="neutral" style="soft" size="sm">
			{BUSINESS_TYPE_LABEL[lead.business_type]}
		</Badge>
		<Badge variant={tempVariant} style="outline" size="sm">
			{ORDER_VALUE_BAND_LABEL[lead.order_value_band]}
		</Badge>
	</div>
</div>
