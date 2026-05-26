<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Switch from './Switch.svelte';

	const { Story } = defineMeta({
		title: 'Form/Switch',
		component: Switch,
		tags: ['autodocs']
	});
</script>

<Story name="Default — off">
	<Switch label="Email notifications" checked={false} />
</Story>

<Story name="Checked">
	<Switch label="Email notifications" checked={true} />
</Story>

<Story name="With hint">
	<Switch
		label="Two-factor authentication"
		hint="Adds an extra step at signin via an authenticator app."
		checked={true}
	/>
</Story>

<Story name="Disabled — on">
	<Switch label="Feature locked at plan tier" checked={true} disabled />
</Story>

<Story name="Disabled — off">
	<Switch label="Coming in v0.2" checked={false} disabled />
</Story>

<Story name="Required">
	<Switch label="Accept terms" required checked={false} />
</Story>
