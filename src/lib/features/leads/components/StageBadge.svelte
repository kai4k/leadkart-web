<script lang="ts">
	import { Badge } from '$ui';
	import { stageBadge } from '$features/leads/view-models';
	import type { LeadStage } from '$features/leads/schemas';

	/**
	 * Static stage badge. For the inline-editable dropdown variant
	 * see InlineStageEditor (composed inside LeadDetail / LeadsList).
	 */
	type Props = {
		stage: LeadStage;
		size?: 'sm' | 'md';
	};

	let { stage, size = 'sm' }: Props = $props();

	const meta = $derived(stageBadge(stage));
</script>

<Badge variant={meta.variant} style="soft" {size}>{meta.label}</Badge>
