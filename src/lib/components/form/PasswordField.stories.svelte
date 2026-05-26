<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PasswordField from './PasswordField.svelte';

	const { Story } = defineMeta({
		title: 'Form/PasswordField',
		component: PasswordField,
		tags: ['autodocs']
	});
</script>

<Story name="Default (empty)">
	<div style="width: 320px;">
		<PasswordField label="Password" autocomplete="current-password" required />
	</div>
</Story>

<Story name="With hint">
	<div style="width: 320px;">
		<PasswordField
			label="New password"
			hint="At least 12 characters. Mix of letters, numbers, and symbols."
			autocomplete="new-password"
			required
		/>
	</div>
</Story>

<Story name="With error">
	<div style="width: 320px;">
		<PasswordField
			label="Password"
			value="weak"
			error="Password must be at least 12 characters."
			autocomplete="new-password"
		/>
	</div>
</Story>

<Story name="With value (masked)">
	<div style="width: 320px;">
		<PasswordField label="Password" value="hunter2hunter2" autocomplete="current-password" />
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 320px;">
		<PasswordField label="Password" value="locked" disabled />
	</div>
</Story>
