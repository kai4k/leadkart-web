<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Alert, Breadcrumbs, Button, Card, type BreadcrumbItem } from '$ui';
	import { NumberInput, ScopeContextField, TextField } from '$form';
	import { ROLE_LEVEL_MAX, ROLE_LEVEL_MIN, ROLE_NAME_MAX, ROLE_NAME_MIN } from '$features/roles';
	import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import type { ActionData } from './$types';

	/**
	 * Dedicated role-creation surface — SvelteKit form action.
	 * On success the action returns redirect(303, /settings/roles/:id)
	 * so the operator lands on the detail page ready to assign
	 * permissions.
	 */

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);

	const failure = $derived(readFailure<{ name: string; hierarchy_level: number }>(form));
	const err = (field: string) => fieldText(failure, field, $_);

	const initial = $derived(
		failure?.values.name !== undefined ? failure.values : { name: '', hierarchy_level: 50 }
	);

	let name = $state(untrack(() => initial.name));
	let hierarchyLevel = $state(untrack(() => initial.hierarchy_level));
	$effect.pre(() => {
		name = initial.name;
		hierarchyLevel = initial.hierarchy_level;
	});

	const bannerError = $derived(bannerText(failure, $_));

	const breadcrumbs: BreadcrumbItem[] = [
		{ label: 'Settings' },
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
				<ScopeContextField />
				<TextField
					label="Role name"
					hint="A short, descriptive name. Visible to members on permission requests."
					name="name"
					bind:value={name}
					minlength={ROLE_NAME_MIN}
					maxlength={ROLE_NAME_MAX}
					required
					error={err('name')}
				/>

				<NumberInput
					label="Hierarchy level"
					name="hierarchy_level"
					hint={`${ROLE_LEVEL_MIN} = highest authority. ${ROLE_LEVEL_MAX} = lowest. Used for hierarchy-scoped operations like lead reassignment and leave approval. Default 50 = middle management.`}
					bind:value={hierarchyLevel}
					min={ROLE_LEVEL_MIN}
					max={ROLE_LEVEL_MAX}
				/>

				{#if bannerError}
					<Alert variant="destructive">{bannerError}</Alert>
				{/if}

				<div class="form-footer">
					<Button variant="ghost" type="button" onclick={() => goto(resolve('settings/roles'))}
						>Cancel</Button
					>

					<Button type="submit" {loading}>Create role</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
