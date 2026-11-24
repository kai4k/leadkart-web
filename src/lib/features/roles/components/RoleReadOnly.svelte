<script lang="ts">
	import { Card, DescriptionList } from '#lib/components/ui/index.ts';
	import { groupedCatalogue } from '../permissions-catalogue.ts';
	import type { RoleDto } from '../types.ts';

	/**
	 * RoleReadOnly: a role shown as it is (name, level, the permissions it grants) for a caller who may
	 * not change it. Plain text, no disabled editors: there is nothing here to operate.
	 */
	let { role }: { role: RoleDto } = $props();

	const granted = $derived(
		Array.from(groupedCatalogue().entries())
			.map(
				([group, entries]) =>
					[group, entries.filter((e) => role.permissions.includes(e.name))] as const
			)
			.filter(([, entries]) => entries.length > 0)
	);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Properties</Card.Title>
	</Card.Header>
	<Card.Content>
		<DescriptionList
			items={[
				{ label: 'Name', value: role.name },
				{ label: 'Hierarchy level', value: role.hierarchy_level }
			]}
		/>
	</Card.Content>
</Card.Root>

<Card.Root>
	<Card.Header>
		<Card.Title>Permissions</Card.Title>
		<Card.Description>{role.permissions.length} granted</Card.Description>
	</Card.Header>
	<Card.Content class="stack stack-relaxed">
		{#each granted as [group, entries] (group)}
			<section class="stack stack-tight">
				<h3 class="h6 capitalize">{group}</h3>
				<ul class="stack stack-tight m-0 list-none ps-0">
					{#each entries as entry (entry.name)}
						<li class="cluster cluster-tight">
							<span class="label text-foreground font-mono text-xs">{entry.name}</span>
							<span class="caption text-muted-foreground">{entry.description}</span>
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<p class="caption text-muted-foreground">This role grants no permissions.</p>
		{/each}
	</Card.Content>
</Card.Root>
