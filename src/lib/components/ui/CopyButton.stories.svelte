<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CopyButton from './CopyButton.svelte';

	/**
	 * CopyButton — click-to-copy with success feedback. Hover/focus
	 * surfaces the action; success toast fires for 2 s after copy.
	 *
	 * Industry refs: GitHub clone-URL button, Linear ID copy, Vercel
	 * env-var copy.
	 */
	const { Story } = defineMeta({
		title: 'UI/CopyButton',
		component: CopyButton,
		tags: ['autodocs'],
		argTypes: { size: { control: 'select', options: ['xs', 'sm', 'md'] } }
	});
</script>

<Story name="Email">
	<div style="display: inline-flex; align-items: center; gap: 0.5rem;">
		<code>alice@example.com</code>
		<CopyButton value="alice@example.com" label="Copy email" />
	</div>
</Story>

<Story name="Tenant ID">
	<div style="display: inline-flex; align-items: center; gap: 0.5rem;">
		<code>tnt_01HVZ4D2NQK3F7B8R5XGM2YQ9P</code>
		<CopyButton value="tnt_01HVZ4D2NQK3F7B8R5XGM2YQ9P" label="Copy tenant ID" />
	</div>
</Story>
