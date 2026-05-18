<!-- src/lib/features/users/components/CreateUserDrawer.svelte -->
<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { users } from '$features/users/stores/users.svelte';
	import type { CreateUserRequest } from '$features/users/types';

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), onOpenChange }: Props = $props();

	let email = $state('');
	let password = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let error = $state<string | null>(null);
	let success = $state<{ membershipId: string; personExisted: boolean } | null>(null);

	function resetForm() {
		email = '';
		password = '';
		firstName = '';
		lastName = '';
		error = null;
		success = null;
	}

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		success = null;
		const req: CreateUserRequest = {
			email: email.trim(),
			password,
			first_name: firstName.trim(),
			last_name: lastName.trim()
		};
		try {
			const resp = await users.create(req);
			success = { membershipId: resp.membership_id, personExisted: resp.person_existed };
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create user';
		}
	}

	function handleClose(next: boolean) {
		if (!next && success) resetForm();
		onOpenChange(next);
	}

	const isSubmitting = $derived(users.status === 'mutating');
</script>

<Drawer.Root bind:open onOpenChange={handleClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Add team member</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Sends a sign-in to the email below. Roles can be assigned after creation.
				</p>
			</div>
			<Drawer.Close>
				<button
					type="button"
					class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
					aria-label="Close"
				>
					×
				</button>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if success}
				<Alert variant="success">
					Member added. {success.personExisted
						? 'This email already had a LeadKart identity; we attached a new tenant membership to it.'
						: 'A new identity was created.'}
				</Alert>
				<div class="cluster mt-4">
					<Button variant="ghost" onclick={resetForm}>Add another</Button>
					<Button onclick={() => handleClose(false)}>Done</Button>
				</div>
			{:else}
				<form id="create-user-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
					<TextField label="Email" name="email" type="email" bind:value={email} required />
					<TextField
						label="First name"
						name="first_name"
						bind:value={firstName}
						required
						maxlength={120}
					/>
					<TextField
						label="Last name"
						name="last_name"
						bind:value={lastName}
						required
						maxlength={120}
					/>
					<PasswordField label="Initial password" name="password" bind:value={password} required />
					<p class="caption text-[var(--color-fg-subtle)]">
						The user will be prompted to change this on first sign-in.
					</p>
					{#if error}<Alert variant="danger">{error}</Alert>{/if}
				</form>
			{/if}
		</Drawer.Body>
		{#if !success}
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={isSubmitting}>Cancel</Button>
				</Drawer.Close>
				<Button type="submit" form="create-user-form" loading={isSubmitting}>Create user</Button>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
