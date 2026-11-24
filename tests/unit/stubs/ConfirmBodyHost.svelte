<script lang="ts">
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';

	let { withField = false }: { withField?: boolean } = $props();
	let open = $state(true);
</script>

<ConfirmDialog bind:open title="Suspend this person" confirmLabel="Suspend" onConfirm={() => {}}>
	{#snippet body()}
		{#if withField}
			<label>Reason <input name="reason" /></label>
		{:else}
			<p>A long explanation that, on a short phone, needs scrolling.</p>
		{/if}
	{/snippet}
</ConfirmDialog>
