<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import { Button } from './button';

	const { Story } = defineMeta({
		title: 'UI/ConfirmDialog',
		component: ConfirmDialog,
		tags: ['autodocs']
	});

	let openDanger = $state(false);
	let openWarning = $state(false);
	let openInfo = $state(false);
	let openDefault = $state(false);
	let openLoading = $state(false);
</script>

<Story name="Danger (delete)">
	<div>
		<Button variant="danger" onclick={() => (openDanger = true)}>Delete tenant</Button>
		<ConfirmDialog
			bind:open={openDanger}
			variant="danger"
			title="Delete Acme Pharma Pvt Ltd?"
			description="This permanently removes the tenant and every membership under it. Cannot be undone."
			confirmLabel="Delete tenant"
			cancelLabel="Cancel"
			onConfirm={() => (openDanger = false)}
		/>
	</div>
</Story>

<Story name="Warning (suspend)">
	<div>
		<Button variant="outline" onclick={() => (openWarning = true)}>Suspend tenant</Button>
		<ConfirmDialog
			bind:open={openWarning}
			variant="warning"
			title="Suspend HealWell Pharma?"
			description="Members lose access immediately. You can restore the tenant at any time."
			confirmLabel="Suspend"
			onConfirm={() => (openWarning = false)}
		/>
	</div>
</Story>

<Story name="Info (send invitation)">
	<div>
		<Button onclick={() => (openInfo = true)}>Send invitation</Button>
		<ConfirmDialog
			bind:open={openInfo}
			variant="info"
			title="Send invitation to priya@acme.com?"
			description="They'll receive an email with a sign-up link valid for 7 days."
			confirmLabel="Send invitation"
			onConfirm={() => (openInfo = false)}
		/>
	</div>
</Story>

<Story name="Default (neutral)">
	<div>
		<Button onclick={() => (openDefault = true)}>Mark as complete</Button>
		<ConfirmDialog
			bind:open={openDefault}
			title="Mark this lead as complete?"
			description="You won't be able to update its stage afterwards."
			confirmLabel="Mark complete"
			onConfirm={() => (openDefault = false)}
		/>
	</div>
</Story>

<Story name="Loading state">
	<div>
		<Button variant="danger" onclick={() => (openLoading = true)}>Revoke API key</Button>
		<ConfirmDialog
			bind:open={openLoading}
			variant="danger"
			title="Revoke API key?"
			description="Every integration using this key will stop working immediately."
			confirmLabel="Revoking…"
			loading
			onConfirm={() => {}}
		/>
	</div>
</Story>
