<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Dialog from '$ui/dialog';
	import Button from '$ui/Button.svelte';
	import TextField from '$lib/components/form/TextField.svelte';

	const { Story } = defineMeta({
		title: 'UI/Dialog',
		component: Dialog.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<Dialog.Root>
		<Dialog.Trigger>
			<Button>Open dialog</Button>
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<h2 class="h4">Revoke API key?</h2>
			</Dialog.Header>
			<Dialog.Body>
				<p class="body-sm text-fg-muted">
					The key will stop working immediately for every integration that uses it. This action
					cannot be undone.
				</p>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button variant="ghost">Cancel</Button>
				</Dialog.Close>
				<Button variant="danger">Revoke</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</Story>

<Story name="With form fields">
	<Dialog.Root>
		<Dialog.Trigger>
			<Button>Invite teammate</Button>
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<h2 class="h4">Invite a teammate</h2>
				<p class="body-sm text-fg-muted">They'll receive an email to set up their account.</p>
			</Dialog.Header>
			<Dialog.Body>
				<div class="stack">
					<TextField label="Full name" placeholder="Priya Sharma" />
					<TextField label="Email" type="email" placeholder="priya@acme.com" />
				</div>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button variant="ghost">Cancel</Button>
				</Dialog.Close>
				<Button>Send invite</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</Story>

<Story name="Long content (scrollable body)">
	<Dialog.Root>
		<Dialog.Trigger>
			<Button>View changelog</Button>
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<h2 class="h4">Release notes — v0.4.2</h2>
			</Dialog.Header>
			<Dialog.Body>
				<div class="stack body-sm text-fg-muted" style="max-height: 320px; overflow-y: auto;">
					{#each Array(20) as _, i (i)}
						<p>
							<strong class="text-fg">Change #{i + 1}.</strong> Lorem ipsum dolor sit amet, consectetur
							adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
						</p>
					{/each}
				</div>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					<Button>Close</Button>
				</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</Story>
