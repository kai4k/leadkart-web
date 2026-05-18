<script lang="ts">
	import { Tooltip } from '$ui';
	import { Info, Icon } from '$icons';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		groupedCatalogue,
		type PermissionCatalogueEntry
	} from '$features/roles/permissions-catalogue';

	type Props = {
		selected: string[];
		disabled?: boolean;
		onChange: (next: string[]) => void;
	};

	let { selected, disabled = false, onChange }: Props = $props();

	const groups = $derived(Array.from(groupedCatalogue().entries()));

	function toggle(name: string) {
		if (disabled) return;
		const set = new SvelteSet(selected);
		if (set.has(name)) set.delete(name);
		else set.add(name);
		onChange([...set]);
	}

	function groupChecked(entries: PermissionCatalogueEntry[]): 'none' | 'some' | 'all' {
		const inGroup = entries.filter((e) => selected.includes(e.name)).length;
		if (inGroup === 0) return 'none';
		if (inGroup === entries.length) return 'all';
		return 'some';
	}

	function toggleGroup(entries: PermissionCatalogueEntry[]) {
		if (disabled) return;
		const state = groupChecked(entries);
		const set = new SvelteSet(selected);
		if (state === 'all') {
			for (const e of entries) set.delete(e.name);
		} else {
			for (const e of entries) set.add(e.name);
		}
		onChange([...set]);
	}
</script>

<div class="stack stack-relaxed" role="tree" aria-label="Permission catalogue">
	{#each groups as [group, entries] (group)}
		{@const state = groupChecked(entries)}
		<section class="stack stack-tight">
			<header class="cluster cluster-spread">
				<label class="cluster cluster-tight cursor-pointer">
					<input
						type="checkbox"
						checked={state === 'all'}
						indeterminate={state === 'some'}
						{disabled}
						onchange={() => toggleGroup(entries)}
						aria-label="Toggle all {group} permissions"
					/>
					<span class="h6 capitalize">{group}</span>
				</label>
				<span class="caption text-fg-muted">
					{entries.filter((e) => selected.includes(e.name)).length} / {entries.length}
				</span>
			</header>
			<ul class="stack stack-tight pl-6" role="group">
				{#each entries as entry (entry.name)}
					<li class="cluster cluster-tight">
						<label class="cluster cluster-tight flex-1 cursor-pointer">
							<input
								type="checkbox"
								checked={selected.includes(entry.name)}
								{disabled}
								onchange={() => toggle(entry.name)}
								aria-label={entry.name}
							/>
							<span class="label text-fg font-mono text-xs">{entry.name}</span>
						</label>
						<Tooltip.Root>
							<Tooltip.Trigger class="text-fg-subtle hover:text-fg-muted">
								<Icon icon={Info} size="sm" />
							</Tooltip.Trigger>
							<Tooltip.Content>{entry.description}</Tooltip.Content>
						</Tooltip.Root>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
