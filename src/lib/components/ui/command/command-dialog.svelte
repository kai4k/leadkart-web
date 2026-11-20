<script lang="ts">
	import { _ } from 'svelte-i18n';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils/cn.ts';
	import Command from './command.svelte';
	import type { Command as CommandPrimitive, Dialog as DialogPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		ref = $bindable(null),
		value = $bindable(''),
		title,
		description,
		showCloseButton = false,
		portalProps,
		children,
		class: className,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.RootProps> &
		WithoutChildrenOrChild<CommandPrimitive.RootProps> & {
			portalProps?: DialogPrimitive.PortalProps;
			children: Snippet;
			title?: string;
			description?: string;
			showCloseButton?: boolean;
			class?: string;
		} = $props();
</script>

<Dialog.Root bind:open {...restProps}>
	<Dialog.Content
		class={cn('rounded-xl! top-1/3 translate-y-0 overflow-hidden p-0', className)}
		{showCloseButton}
		{portalProps}
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>{title ?? $_('common.commandPalette.title')}</Dialog.Title>
			<Dialog.Description
				>{description ?? $_('common.commandPalette.description')}</Dialog.Description
			>
		</Dialog.Header>
		<Command {...restProps} bind:value bind:ref {children} />
	</Dialog.Content>
</Dialog.Root>
