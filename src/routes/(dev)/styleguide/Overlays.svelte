<script lang="ts">
	/**
	 * Styleguide "Overlays & feedback": the surfaces that stack, flash or highlight, so a human (and
	 * the visual checks) can look at them without a signed-in app: a Dialog opened over a Sheet, one
	 * toast of each type, table rows (hover vs selected), a list with a highlighted item, tabs.
	 * Static demo content, no API calls.
	 */
	import { Button, Command, Dialog, DropdownMenu, Sheet, Tabs, toast } from '$ui';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { z } from 'zod';
	import { DatePicker, FormSheet, TextField } from '$form';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';

	let sheetOpen = $state(false);
	let dialogOpen = $state(false);
	let formSheetOpen = $state(false);
	let reasonOpen = $state(false);
	const demoSchema = z.object({ name: z.string().min(1, 'Enter a name.') });
	const rows = [
		{ id: 'r1', name: 'Alpha Pharma', state: 'normal' },
		{ id: 'r2', name: 'Beta Distributors', state: 'selected' },
		{ id: 'r3', name: 'Gamma Chemists', state: 'normal' }
	] as const;
</script>

{#snippet row(title: string, note?: string)}
	<div class="stack stack-tight">
		<h3 class="h4">{title}</h3>
		{#if note}<p class="caption text-muted-foreground">{note}</p>{/if}
	</div>
{/snippet}

<section
	aria-labelledby="overlays-heading"
	class="stack stack-loose rounded-xl border border-border bg-card p-6"
>
	<h2 id="overlays-heading" class="h2">Overlays &amp; feedback</h2>

	{@render row('Stacked modals', 'A Dialog opened over a Sheet: its scrim covers the sheet.')}
	<div class="cluster">
		<Button onclick={() => (sheetOpen = true)}>Open sheet</Button>
	</div>
	<Sheet.Root bind:open={sheetOpen}>
		<Sheet.Content title="Demo sheet">
			<Sheet.Body>
				<p class="body-base">A sheet with a form-like body.</p>
				<DatePicker
					label="Follow-up date"
					name="followup"
					hint="Typed or picked; opened over the sheet."
				/>
				<Button onclick={() => (dialogOpen = true)}>Open confirm over the sheet</Button>
			</Sheet.Body>
		</Sheet.Content>
	</Sheet.Root>
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content title="Demo confirm" size="sm">
			<Dialog.Body>
				<p class="body-base">Opened over the sheet.</p>
				<div class="cluster">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger variant="outline">Open a menu in the dialog</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item>First choice</DropdownMenu.Item>
							<DropdownMenu.Item>Second choice</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<Button variant="outline" onclick={() => toast('Saved to drafts.')}
						>Toast from the dialog</Button
					>
				</div>
			</Dialog.Body>
			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="ghost">Cancel</Button>
					{/snippet}
				</Dialog.Close>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	{@render row(
		'Form sheet and reason confirm',
		'The real FormSheet and the real ReasonConfirmDialog: the confirm opened over the sheet is opaque.'
	)}
	<div class="cluster">
		<Button onclick={() => (formSheetOpen = true)}>Open form sheet</Button>
	</div>
	<FormSheet
		bind:open={formSheetOpen}
		onOpenChange={(o) => (formSheetOpen = o)}
		title="Demo form sheet"
		description="A form in a sheet."
		submitLabel="Save demo"
		schema={demoSchema}
		initial={() => ({ name: '' })}
		onSubmit={async () => {}}
		formId="demo-form-sheet"
	>
		{#snippet fields(form)}
			<TextField
				label="Demo name"
				name="name"
				bind:value={form.values.name}
				error={form.errors.name}
			/>
			<Button variant="outline" onclick={() => (reasonOpen = true)}>Delete the demo</Button>
		{/snippet}
	</FormSheet>
	<ReasonConfirmDialog
		bind:open={reasonOpen}
		onOpenChange={(o) => (reasonOpen = o)}
		title="Delete the demo"
		description="This is a demonstration."
		confirmLabel="Delete demo"
		confirmText="acme"
		messages={{
			failed: 'Could not delete the demo.',
			forbidden: "You don't have permission to delete the demo.",
			notFound: 'The demo was deleted or moved.'
		}}
		onConfirm={async () => {}}
	/>

	{@render row('Toasts', 'One of each type; the default one is the pane material.')}
	<div class="cluster">
		<Button variant="outline" onclick={() => toast('Saved to drafts.')}>Default</Button>
		<Button variant="outline" onclick={() => toast.success('Saved the demo.')}>Success</Button>
		<Button variant="outline" onclick={() => toast.error('Could not save the demo.')}>Error</Button>
		<Button variant="outline" onclick={() => toast.warning('This demo is almost full.')}
			>Warning</Button
		>
		<Button variant="outline" onclick={() => toast.info('A new demo is available.')}>Info</Button>
	</div>

	{@render row('Table rows', 'Normal, hover (move the pointer over a row) and selected.')}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>Name</Table.Head>
				<Table.Head>State</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as r (r.id)}
				<Table.Row data-state={r.state === 'selected' ? 'selected' : undefined}>
					<Table.Cell>{r.name}</Table.Cell>
					<Table.Cell class="text-muted-foreground">{r.state}</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

	{@render row('Highlighted list item', 'The first item is the active one.')}
	<div class="max-w-xs rounded-lg border border-border bg-popover p-1">
		<Command.Root>
			<Command.List aria-label="Demo list">
				<Command.Item value="one">First item</Command.Item>
				<Command.Item value="two">Second item</Command.Item>
				<Command.Item value="three">Third item</Command.Item>
			</Command.List>
		</Command.Root>
	</div>

	{@render row('Tabs', 'The active tab keeps a border against the list.')}
	<Tabs.Root value="a">
		<Tabs.List>
			<Tabs.Trigger value="a">Overview</Tabs.Trigger>
			<Tabs.Trigger value="b">Activity</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>
</section>
