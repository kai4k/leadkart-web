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
		/** Permissions the server would refuse here, by name -> the reason: shown disabled with the reason. */
		refused?: Record<string, string>;
		onChange: (next: string[]) => void;
	};

	let { selected, disabled = false, refused = {}, onChange }: Props = $props();

	const groups = $derived(Array.from(groupedCatalogue().entries()));

	function toggle(name: string) {
		if (disabled || name in refused) return;
		const set = new SvelteSet(selected);
		if (set.has(name)) set.delete(name);
		else set.add(name);
		onChange([...set]);
	}

	/** The names of a group this caller may change: a refused one keeps the state it has, checked or not. */
	const allowed = (entries: PermissionCatalogueEntry[]) =>
		entries.filter((e) => !(e.name in refused));

	// Over the ALLOWED names only: a group holding a refused name reaches "all" once every name the caller may change is
	// selected, so its checkbox can clear them again (it used to be stuck on "some" for ever).
	function groupChecked(entries: PermissionCatalogueEntry[]): 'none' | 'some' | 'all' {
		const open = allowed(entries);
		const inGroup = open.filter((e) => selected.includes(e.name)).length;
		if (inGroup === 0) return 'none';
		if (inGroup === open.length) return 'all';
		return 'some';
	}

	function toggleGroup(entries: PermissionCatalogueEntry[]) {
		if (disabled) return;
		const state = groupChecked(entries);
		const set = new SvelteSet(selected);
		for (const e of allowed(entries)) {
			if (state === 'all') set.delete(e.name);
			else set.add(e.name);
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
						checked={state === 'all' && allowed(entries).length > 0}
						indeterminate={state === 'some'}
						disabled={disabled || allowed(entries).length === 0}
						onchange={() => toggleGroup(entries)}
						aria-label="Toggle all {group} permissions"
					/>
					<span class="h6 capitalize">{group}</span>
				</label>
				<span class="caption text-muted-foreground">
					{entries.filter((e) => selected.includes(e.name)).length} / {entries.length}
				</span>
			</header>
			<ul class="stack stack-tight ps-6" role="group">
				{#each entries as entry (entry.name)}
					<li class="cluster cluster-tight">
						<label class="cluster cluster-tight flex-1 cursor-pointer">
							<input
								type="checkbox"
								checked={selected.includes(entry.name)}
								disabled={disabled || entry.name in refused}
								onchange={() => toggle(entry.name)}
								aria-label={entry.name}
								aria-describedby={entry.name in refused ? `refused-${entry.name}` : undefined}
							/>
							<span class="label text-foreground font-mono text-xs">{entry.name}</span>
							{#if entry.name in refused}
								<span id="refused-{entry.name}" class="caption text-muted-foreground"
									>{refused[entry.name]}</span
								>
							{/if}
						</label>
						<Tooltip.Root>
							<Tooltip.Trigger
								class="text-subtle-foreground hover:text-muted-foreground"
								aria-label="About {entry.name}"
							>
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
