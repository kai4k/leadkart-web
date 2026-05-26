<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Mail, Search, Icon } from '$lib/icons';
	import TextField from './TextField.svelte';

	const { Story } = defineMeta({
		title: 'Form/TextField',
		component: TextField,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<div style="width: 320px;">
		<TextField label="Email" placeholder="you@example.com" />
	</div>
</Story>

<Story name="With value">
	<div style="width: 320px;">
		<TextField label="Email" value="alice@example.com" />
	</div>
</Story>

<Story name="With hint">
	<div style="width: 320px;">
		<TextField
			label="Display name"
			hint="Visible to your team. Max 64 characters."
			value="Acme Pharma"
		/>
	</div>
</Story>

<Story name="With error">
	<div style="width: 320px;">
		<TextField
			label="Email"
			value="not-an-email"
			error="Enter a valid email address."
			type="email"
		/>
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 320px;">
		<TextField label="Email" value="alice@example.com" disabled />
	</div>
</Story>

<Story name="Required">
	<div style="width: 320px;">
		<TextField label="Email" required placeholder="you@example.com" />
	</div>
</Story>

<Story name="With leading icon">
	<div style="width: 320px;">
		<TextField label="Email" placeholder="you@example.com">
			{#snippet leading()}
				<Icon icon={Mail} size="sm" />
			{/snippet}
		</TextField>
	</div>
</Story>

<Story name="Search variant">
	<div style="width: 320px;">
		<TextField label="Search" srLabel placeholder="Search tenants, persons, leads…">
			{#snippet leading()}
				<Icon icon={Search} size="sm" />
			{/snippet}
		</TextField>
	</div>
</Story>
