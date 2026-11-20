<script lang="ts">
	import RadioGroup from '#lib/components/form/RadioGroup.svelte';
	import RadioItem from '#lib/components/form/RadioItem.svelte';

	let { label, hint, error }: { label: string; hint?: string; error?: string | null } = $props();
</script>

<RadioGroup {label} {hint} {error} name="plan">
	<RadioItem value="starter" label="Starter" />
	<RadioItem value="pro" label="Pro" />
</RadioGroup>
