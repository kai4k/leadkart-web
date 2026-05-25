<!-- src/lib/features/users/components/CreateUserDrawer.svelte -->
<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, PasswordField } from '$lib/components/form';
	import { createUserMutation } from '$features/users/queries';
	import { createUserRequestSchema } from '$features/users/schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), onOpenChange }: Props = $props();

	let success = $state<{ membershipId: string; personExisted: boolean } | null>(null);

	const mutation = createUserMutation();
	const form = useForm(
		createUserRequestSchema,
		{
			email: '',
			password: '',
			first_name: '',
			last_name: ''
		},
		{ validateOn: 'blur' }
	);

	function resetAll() {
		form.reset();
		success = null;
	}

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(values, {
					onSuccess: (resp) => {
						success = { membershipId: resp.membership_id, personExisted: resp.person_existed };
						resolve();
					},
					onError: (err) => reject(err)
				});
			});
		});
	}

	function handleClose(next: boolean) {
		if (!next && success) resetAll();
		onOpenChange(next);
	}
</script>

<Drawer.Root bind:open onOpenChange={handleClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Add team member</h2>
				<p class="caption text-fg-muted">
					Sends a sign-in to the email below. Roles can be assigned after creation.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
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
					<Button variant="ghost" onclick={resetAll}>Add another</Button>
					<Button onclick={() => handleClose(false)}>Done</Button>
				</div>
			{:else}
				<form id="create-user-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
					<TextField
						label="Email"
						name="email"
						type="email"
						bind:value={form.values.email}
						required
						error={form.errors.email}
						onblur={() => form.validateField('email')}
					/>
					<TextField
						label="First name"
						name="first_name"
						bind:value={form.values.first_name}
						required
						maxlength={120}
						error={form.errors.first_name}
						onblur={() => form.validateField('first_name')}
					/>
					<TextField
						label="Last name"
						name="last_name"
						bind:value={form.values.last_name}
						required
						maxlength={120}
						error={form.errors.last_name}
						onblur={() => form.validateField('last_name')}
					/>
					<PasswordField
						label="Initial password"
						name="password"
						bind:value={form.values.password}
						required
						error={form.errors.password}
						onblur={() => form.validateField('password')}
					/>
					<p class="caption text-fg-subtle">
						The user will be prompted to change this on first sign-in.
					</p>
					{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
				</form>
			{/if}
		</Drawer.Body>
		{#if !success}
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				</Drawer.Close>
				<Button type="submit" form="create-user-form" loading={form.isSubmitting}
					>Create user</Button
				>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
