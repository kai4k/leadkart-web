<script lang="ts" module>
	import { Icon, MoreHorizontal, type LucideIcon } from '#lib/icons/index.ts';

	export type RowAction = {
		id: string;
		label: string;
		icon?: LucideIcon;
		variant?: 'default' | 'destructive';
		onSelect?: () => void;
		/** A navigation: rendered as the menu item itself (an anchor), never a link inside an item. */
		href?: string;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	/**
	 * RowActionsMenu — the "⋯" menu at the end of a table row. The trigger names the row it acts on
	 * ("Actions for Sales Lead"), so a screen-reader user hears which row, not "Row actions" twenty times.
	 * Icons are all or none (GD16): one plain action turns every icon off, so the labels stay aligned.
	 */
	import { _ } from 'svelte-i18n';
	import { Dropdown } from '#lib/components/ui/index.ts';

	type Props = { label: string; actions: RowAction[] };
	let { label, actions }: Props = $props();

	const showIcons = $derived(actions.length > 0 && actions.every((a) => a.icon !== undefined));
</script>

{#snippet body(action: RowAction)}
	{#if showIcons && action.icon}<Icon icon={action.icon} size="sm" />{/if}
	{action.label}
{/snippet}

<Dropdown.Root>
	<Dropdown.Trigger
		variant="ghost"
		size="sm"
		aria-label={$_('dataTable.rowActions', { values: { row: label } })}
	>
		<Icon icon={MoreHorizontal} size="sm" />
	</Dropdown.Trigger>
	<Dropdown.Menu align="end" class="w-48">
		{#each actions as action (action.id)}
			{#if action.href && !action.disabled}
				<Dropdown.Item variant={action.variant ?? 'default'}>
					{#snippet child({ props })}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- the caller passes a resolved path -->
						<a {...props} href={action.href}>{@render body(action)}</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{/snippet}
				</Dropdown.Item>
			{:else}
				<Dropdown.Item
					variant={action.variant ?? 'default'}
					disabled={action.disabled}
					onSelect={action.onSelect}
				>
					{@render body(action)}
				</Dropdown.Item>
			{/if}
		{/each}
	</Dropdown.Menu>
</Dropdown.Root>
