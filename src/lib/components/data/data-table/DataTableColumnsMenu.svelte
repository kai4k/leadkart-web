<script lang="ts" generics="T">
	/**
	 * The "Columns" menu: one check item per hideable column. Stays open while toggling
	 * (`closeOnSelect` is off on the check item) so several columns can be changed in a row.
	 */
	import { _ } from 'svelte-i18n';
	import { Dropdown } from '#lib/components/ui/index.ts';
	import { ChevronDown, Icon } from '#lib/icons/index.ts';
	import type { DataTableColumn } from './types.ts';

	type Props = {
		columns: DataTableColumn<T>[];
		/** TanStack visibility state: only `false` entries hide a column. */
		visibility: Record<string, boolean>;
		onToggle: (id: string, visible: boolean) => void;
	};
	let { columns, visibility, onToggle }: Props = $props();
</script>

<Dropdown.Root>
	<Dropdown.Trigger variant="secondary" size="sm">
		{$_('dataTable.columns')}
		<Icon icon={ChevronDown} size="xs" />
	</Dropdown.Trigger>
	<Dropdown.Menu align="end" class="w-48">
		{#each columns as column (column.id)}
			<Dropdown.CheckboxItem
				checked={visibility[column.id] !== false}
				onCheckedChange={(next) => onToggle(column.id, next)}
			>
				{column.header}
			</Dropdown.CheckboxItem>
		{/each}
	</Dropdown.Menu>
</Dropdown.Root>
