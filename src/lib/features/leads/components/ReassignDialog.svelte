<script lang="ts">
	/**
	 * ReassignDialog — confirm-style dialog for moving a lead's ownership.
	 *
	 * NOTE on `to_membership_id` input: the contract calls for a typeahead
	 * Combobox backed by a `/v1/identity/memberships?q=` search endpoint
	 * that ships later this sprint. Until then we accept a raw membership
	 * UUID via TextField — operators paste it from the membership page.
	 * Swap to `<Combobox onInput=…>` when the backend search lands.
	 */
	import { Dialog, Button, Alert } from '$ui';
	import { TextField } from '$form';
	import { reassignLeadSchema } from '../schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { reassignLeadMutation } from '../queries';

	type Props = {
		leadId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { leadId, open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = reassignLeadMutation();
	const form = useForm(
		reassignLeadSchema,
		{ to_membership_id: '', reason: '' },
		{ validateOn: 'blur' }
	);

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: leadId, req: values },
					{
						onSuccess: () => {
							form.reset();
							onOpenChange(false);
							resolve();
						},
						onError: (err) => reject(err)
					}
				);
			});
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h5">Reassign lead</h2>
				<p class="body-sm text-fg-muted">
					Transfer ownership to another team member. The history tab keeps an audit trail.
				</p>
			</div>
		</Dialog.Header>

		<Dialog.Body>
			<form id="reassign-lead-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="New owner (membership ID)"
					name="to_membership_id"
					bind:value={form.values.to_membership_id}
					placeholder="00000000-0000-0000-0000-000000000000"
					required
					error={form.errors.to_membership_id}
					onblur={() => form.validateField('to_membership_id')}
				/>

				<label class="stack stack-tight">
					<span class="label">Reason (optional)</span>
					<textarea
						name="reason"
						bind:value={form.values.reason}
						rows={3}
						maxlength={500}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
						placeholder="Why the lead is being moved"
					></textarea>
				</label>

				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Dialog.Body>

		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Dialog.Close>
			<Button type="submit" form="reassign-lead-form" loading={form.isSubmitting}>Reassign</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
