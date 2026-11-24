<script lang="ts">
	import { Tooltip } from '#lib/components/ui/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';
	import { Info, Icon } from '#lib/icons/index.ts';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		groupedCatalogue,
		type PermissionCatalogueEntry
	} from '#lib/features/roles/permissions-catalogue.ts';

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

	// The CLICK works over the ALLOWED names only: a group holding a refused name reaches "all" once every name the caller may change is
	// selected, so its checkbox can clear them again (it used to be stuck on "some" for ever).
	function groupChecked(entries: PermissionCatalogueEntry[]): 'none' | 'some' | 'all' {
		const open = allowed(entries);
		const inGroup = open.filter((e) => selected.includes(e.name)).length;
		if (inGroup === 0) return 'none';
		if (inGroup === open.length) return 'all';
		return 'some';
	}

	/** What the group checkbox SHOWS: every name of the group, refused ones included. */
	function groupShown(entries: PermissionCatalogueEntry[]): 'none' | 'some' | 'all' {
		const inGroup = entries.filter((e) => selected.includes(e.name)).length;
		if (inGroup === 0) return 'none';
		return inGroup === entries.length ? 'all' : 'some';
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

<div class="stack stack-relaxed">
	{#each groups as [group, entries] (group)}
		{@const state = groupShown(entries)}
		<fieldset class="stack stack-tight m-0 border-0 p-0">
			<legend class="sr-only">{group}</legend>
			<div class="cluster cluster-spread">
				<label class="cluster cluster-tight cursor-pointer">
					<Checkbox
						checked={state === 'all' && allowed(entries).length > 0}
						indeterminate={state === 'some'}
						disabled={disabled || allowed(entries).length === 0}
						onCheckedChange={() => toggleGroup(entries)}
						aria-label="Toggle all {group} permissions"
					/>
					<span class="h6 capitalize" aria-hidden="true">{group}</span>
				</label>
				<span class="caption text-muted-foreground">
					{entries.filter((e) => selected.includes(e.name)).length} / {entries.length}
				</span>
			</div>
			<ul class="stack stack-tight m-0 list-none ps-6">
				{#each entries as entry (entry.name)}
					<li class="cluster cluster-tight">
						<label class="cluster cluster-tight flex-1 cursor-pointer">
							<Checkbox
								checked={selected.includes(entry.name)}
								disabled={disabled || entry.name in refused}
								onCheckedChange={() => toggle(entry.name)}
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
								class="text-muted-foreground hover:text-foreground"
								aria-label="About {entry.name}"
							>
								<Icon icon={Info} size="sm" />
							</Tooltip.Trigger>
							<Tooltip.Content>{entry.description}</Tooltip.Content>
						</Tooltip.Root>
					</li>
				{/each}
			</ul>
		</fieldset>
	{/each}
</div>
