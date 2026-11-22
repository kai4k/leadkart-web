<script lang="ts">
	import PageHeader from '$layouts/PageHeader.svelte';
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import { Button, Card } from '$ui';
	import { ActionForm, NumberInput, TextField } from '$form';
	import { ROLE_LEVEL_MAX, ROLE_LEVEL_MIN, ROLE_NAME_MAX, ROLE_NAME_MIN } from '$features/roles';
	import { readFailure } from '#lib/utils/form-failure.ts';
	import type { ActionData } from './$types';

	/**
	 * Dedicated role-creation surface — SvelteKit form action.
	 * On success the action returns redirect(303, /settings/roles/:id)
	 * so the operator lands on the detail page ready to assign
	 * permissions.
	 */

	let { form }: { form: ActionData } = $props();
	const failure = $derived(readFailure<{ name: string; hierarchy_level: number }>(form));

	const initial = $derived(
		failure?.values.name !== undefined ? failure.values : { name: '', hierarchy_level: 50 }
	);

	let name = $state(untrack(() => initial.name));
	let hierarchyLevel = $state(untrack(() => initial.hierarchy_level));
	$effect.pre(() => {
		name = initial.name;
		hierarchyLevel = initial.hierarchy_level;
	});

	const crumbs = $derived([
		{ label: $_('pages.crumbs.settings') },
		{ href: '/settings/roles', label: $_('nav.items.roles') },
		{ label: $_('nav.items.roleNew') }
	]);
</script>

<svelte:head><title>New role · LeadKart</title></svelte:head>

<div class="stack stack-relaxed">
	<PageHeader
		title={$_('pages.roleNew.title')}
		description={$_('pages.roleNew.description')}
		{crumbs}
	/>

	<Card.Root padding="md" elevation="sm">
		<Card.Content>
			<ActionForm
				id="role-new-form"
				result={form}
				relaxed
				guardLeave
				submitLabel={$_('pages.roleNew.submit')}
			>
				{#snippet children({ fieldError })}
					<TextField
						label="Role name"
						hint="A short, descriptive name. Visible to members on permission requests."
						name="name"
						bind:value={name}
						minlength={ROLE_NAME_MIN}
						maxlength={ROLE_NAME_MAX}
						required
						error={fieldError('name')}
					/>

					<NumberInput
						label="Hierarchy level"
						name="hierarchy_level"
						hint={`${ROLE_LEVEL_MIN} = highest authority. ${ROLE_LEVEL_MAX} = lowest. Used for hierarchy-scoped operations like lead reassignment and leave approval. Default 50 = middle management.`}
						bind:value={hierarchyLevel}
						min={ROLE_LEVEL_MIN}
						max={ROLE_LEVEL_MAX}
						error={fieldError('hierarchy_level')}
					/>
				{/snippet}
				{#snippet secondary()}
					<Button variant="ghost" href={resolve('settings/roles')}>Cancel</Button>
				{/snippet}
			</ActionForm>
		</Card.Content>
	</Card.Root>
</div>
