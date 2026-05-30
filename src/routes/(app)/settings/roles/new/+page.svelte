<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Alert, Breadcrumbs, Button, Card } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { NumberInput, TextField } from '$form';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import type { ActionData } from './$types';

	/**
	 * Dedicated role-creation surface — SvelteKit form action.
	 * On success the action returns redirect(303, /settings/roles/:id)
	 * so the operator lands on the detail page ready to assign
	 * permissions.
	 */

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.roles.manage')) {
			goto('/dashboard', { replaceState: true });
		}
	});

	function err(field: string): string | undefined {
		const v = (form as { errors?: Record<string, string | string[] | undefined> } | null)?.errors?.[
			field
		];
		if (typeof v === 'string') return v;
		if (Array.isArray(v)) return v[0];
		return undefined;
	}

	const initial = $derived(
		(form as { values?: { name: string; hierarchy_level: number } } | null)?.values ?? {
			name: '',
			hierarchy_level: 50
		}
	);

	let name = $state(initial.name);
	let hierarchyLevel = $state(initial.hierarchy_level);
	$effect.pre(() => {
		name = initial.name;
		hierarchyLevel = initial.hierarchy_level;
	});

	const bannerError = $derived((form as { bannerError?: string } | null)?.bannerError ?? null);

	const breadcrumbs: BreadcrumbItem[] = [
		{ href: '/settings', label: 'Settings' },
		{ href: '/settings/roles', label: 'Roles' },
		{ label: 'New role' }
	];
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
			<form
				class="stack stack-relaxed"
				method="POST"
				novalidate
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				<TextField
					label="Role name"
					hint="A short, descriptive name. Visible to members on permission requests."
					name="name"
					bind:value={name}
					minlength={3}
					maxlength={100}
					required
					error={err('name')}
				/>

				<NumberInput
					label="Hierarchy level"
					name="hierarchy_level"
					hint="0 = highest authority (Owner). 100 = lowest. Used for hierarchy-scoped operations like lead reassignment and leave approval. Default 50 = middle management."
					bind:value={hierarchyLevel}
					min={0}
					max={100}
				/>

				{#if bannerError}
					<Alert variant="danger">{bannerError}</Alert>
				{/if}

				<div class="form-footer">
					<Button variant="ghost" type="button" onclick={() => goto('/settings/roles')}>
						Cancel
					</Button>
					<Button type="submit" {loading}>Create role</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
