<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, Breadcrumbs, Button, Card } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { NumberInput, TextField } from '$form';
	import { createRoleMutation } from '$features/roles/queries';
	import { createRoleRequestSchema } from '$features/roles/schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	/**
	 * Dedicated role-creation surface. The list page exposes the same
	 * flow via CreateRoleDrawer for quick adds; this page is the
	 * canonical deep-link surface for fuller authoring (used by audit
	 * trails, "Create role" CTAs from elsewhere, and screen-reader
	 * users who prefer a full page over a slide-over).
	 *
	 * On success, navigates to the new role's detail page so the
	 * operator can immediately assign permissions.
	 */

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.roles.manage')) {
			goto('/dashboard', { replaceState: true });
		}
	});

	const mutation = createRoleMutation();
	const form = useForm(
		createRoleRequestSchema,
		{ name: '', hierarchy_level: 50 },
		{ validateOn: 'blur' }
	);

	const breadcrumbs: BreadcrumbItem[] = [
		{ href: '/settings', label: 'Settings' },
		{ href: '/settings/roles', label: 'Roles' },
		{ label: 'New role' }
	];

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(values, {
					onSuccess: (result) => {
						goto(`/settings/roles/${result.role_id}`, { replaceState: true });
						resolve();
					},
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<svelte:head><title>New role · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />

	<header class="stack stack-tight">
		<h1 class="h1">Create role</h1>
		<p class="body-sm text-fg-muted">
			Roles bundle permissions for assignment to members. After creating the role, you'll be
			redirected to its detail page where you can assign permissions and set its place in the
			reporting hierarchy.
		</p>
	</header>

	<Card.Root padding="md" elevation="sm">
		<Card.Content>
			<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Role name"
					hint="A short, descriptive name. Visible to members on permission requests."
					name="name"
					bind:value={form.values.name}
					minlength={3}
					maxlength={100}
					required
					error={form.errors.name}
					onblur={() => form.validateField('name')}
				/>

				<NumberInput
					label="Hierarchy level"
					hint="0 = highest authority (Owner). 100 = lowest. Used for hierarchy-scoped operations like lead reassignment and leave approval. Default 50 = middle management."
					bind:value={form.values.hierarchy_level}
					min={0}
					max={100}
				/>

				{#if form.bannerError}
					<Alert variant="danger">{form.bannerError}</Alert>
				{/if}

				<div class="form-footer">
					<Button variant="ghost" type="button" onclick={() => goto('/settings/roles')}>
						Cancel
					</Button>
					<Button type="submit" loading={form.isSubmitting}>Create role</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
