<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField, Select } from '$lib/components/form';
	import { createLeadMutation } from '$features/leads/queries';
	import { createLeadSchema } from '$features/leads/schemas';
	import { STAGE_OPTIONS, SOURCE_OPTIONS } from '$features/leads/view-models';
	import { useForm } from '$lib/hooks/use-form.svelte';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createLeadMutation();
	const form = useForm(
		createLeadSchema,
		{
			full_name: '',
			company: '',
			email: '',
			phone: '',
			source: 'manual',
			stage: 'new',
			value: undefined,
			currency: 'USD',
			tags: [],
			notes: ''
		},
		{ validateOn: 'blur' }
	);

	let tagsInput = $state('');

	function syncTags() {
		form.values.tags = tagsInput
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t.length > 0);
	}

	async function onSubmit(e: SubmitEvent) {
		syncTags();
		await form.submit(e, async (values) => {
			// Strip empty optional strings so the server does not see "".
			const payload = {
				...values,
				email: values.email || undefined,
				phone: values.phone || undefined,
				company: values.company || undefined,
				notes: values.notes || undefined
			};
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(payload, {
					onSuccess: () => {
						form.reset();
						tagsInput = '';
						onOpenChange(false);
						resolve();
					},
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">New lead</h2>
				<p class="caption text-fg-muted">
					Capture a prospect manually. Existing leads can also be imported via the bulk upload
					action.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form id="create-lead-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Full name"
					name="full_name"
					placeholder="Jane Doe"
					bind:value={form.values.full_name}
					required
					error={form.errors.full_name}
					onblur={() => form.validateField('full_name')}
				/>
				<TextField
					label="Company"
					name="company"
					placeholder="Acme Inc."
					bind:value={form.values.company as string}
				/>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<TextField
						label="Email"
						name="email"
						type="email"
						placeholder="jane@acme.com"
						bind:value={form.values.email as string}
						error={form.errors.email}
						onblur={() => form.validateField('email')}
					/>
					<TextField
						label="Phone"
						name="phone"
						placeholder="+1 555 0100"
						bind:value={form.values.phone as string}
					/>
				</div>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Select
						label="Source"
						name="source"
						bind:value={form.values.source}
						options={SOURCE_OPTIONS}
					/>
					<Select
						label="Stage"
						name="stage"
						bind:value={form.values.stage}
						options={STAGE_OPTIONS}
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<label class="stack stack-tight">
						<span class="label">Estimated value</span>
						<input
							type="number"
							name="value"
							min="0"
							step="0.01"
							bind:value={form.values.value as number}
							class="glass-input rounded-md px-3 py-2 text-sm"
						/>
					</label>
					<TextField
						label="Currency"
						name="currency"
						placeholder="USD"
						bind:value={form.values.currency}
						maxlength={3}
					/>
				</div>
				<TextField
					label="Tags (comma-separated)"
					name="tags"
					placeholder="enterprise, follow-up"
					bind:value={tagsInput}
				/>
				<label class="stack stack-tight">
					<span class="label">Notes</span>
					<textarea
						bind:value={form.values.notes as string}
						maxlength={4000}
						rows={4}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>
				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-lead-form" loading={form.isSubmitting}>Create lead</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
