<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Drawer from '$ui/drawer';
	import { Button } from '$ui/button';
	import TextField from '$lib/components/form/TextField.svelte';
	import Select from '$lib/components/form/Select.svelte';

	const { Story } = defineMeta({
		title: 'UI/Drawer',
		component: Drawer.Root,
		tags: ['autodocs']
	});

	const STATES = [
		{ value: 'mh', label: 'Maharashtra' },
		{ value: 'ka', label: 'Karnataka' },
		{ value: 'tn', label: 'Tamil Nadu' },
		{ value: 'dl', label: 'Delhi' }
	];
</script>

<Story name="Edit form (default)">
	<Drawer.Root>
		<Drawer.Trigger>
			<Button>Edit tenant</Button>
		</Drawer.Trigger>
		<Drawer.Content>
			<Drawer.Header>
				<h2 class="h4">Edit tenant profile</h2>
				<p class="body-sm text-fg-muted">Changes apply to this tenant only.</p>
			</Drawer.Header>
			<Drawer.Body>
				<div class="stack">
					<TextField label="Trade name" value="Acme Pharma Pvt Ltd" />
					<TextField label="GSTIN" value="27AABCA1234A1ZQ" />
					<Select label="State" options={STATES} value="mh" />
					<TextField label="Phone" value="+91 98765 43210" />
				</div>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost">Cancel</Button>
				</Drawer.Close>
				<Button>Save changes</Button>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
</Story>

<Story name="Details view (read-only)">
	<Drawer.Root>
		<Drawer.Trigger>
			<Button variant="outline">View lead</Button>
		</Drawer.Trigger>
		<Drawer.Content>
			<Drawer.Header>
				<h2 class="h4">Lead #LK-1042</h2>
				<p class="body-sm text-fg-muted">Captured 2026-05-19 from /quote-request</p>
			</Drawer.Header>
			<Drawer.Body>
				<dl class="stack body-sm">
					<div class="flex justify-between gap-4">
						<dt class="text-fg-muted">Contact</dt>
						<dd class="text-fg font-medium">Priya Sharma</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-fg-muted">Company</dt>
						<dd class="text-fg font-medium">MediCare Distributors</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-fg-muted">Interest</dt>
						<dd class="text-fg font-medium">Cetirizine 10mg, Paracetamol 500mg</dd>
					</div>
					<div class="flex justify-between gap-4">
						<dt class="text-fg-muted">Estimated value</dt>
						<dd class="text-fg font-medium tabular-nums">₹4,20,000</dd>
					</div>
				</dl>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost">Close</Button>
				</Drawer.Close>
				<Button>Convert to deal</Button>
			</Drawer.Footer>
		</Drawer.Content>
	</Drawer.Root>
</Story>
