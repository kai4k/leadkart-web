<script lang="ts">
	/**
	 * ReassignDialog — confirm-style dialog for moving a lead's ownership.
	 *
	 * Typeahead Combobox backed by `GET /v1/identity/memberships?q=` —
	 * the operator types two characters and picks a teammate from the
	 * dropdown. The membership UUID is the value that's POSTed; the
	 * label combines firstname + lastname and the description carries
	 * the email so two teammates with the same surname are still
	 * distinguishable at a glance.
	 *
	 * Backend endpoint is documented in the CRM contracts spec; the BFF
	 * proxy forwards the request untouched, and the test suite mocks
	 * the response inline.
	 */
	import { Dialog, Button, Alert } from '$ui';
	import { Combobox, type ComboboxOption } from '$form';
	import { reassignLeadSchema } from '../schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { reassignLeadMutation } from '../queries';
	import { membershipSearchQuery } from '$features/users/queries';

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

	let memberQuery = $state('');
	const search = membershipSearchQuery(() => memberQuery);

	const memberOptions = $derived<ComboboxOption[]>(
		(search.data?.memberships ?? []).map((m) => ({
			value: m.id,
			label: `${m.first_name} ${m.last_name}`.trim() || m.email,
			description: m.email
		}))
	);

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: leadId, req: values },
					{
						onSuccess: () => {
							form.reset();
							memberQuery = '';
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
				<Combobox
					label="New owner"
					name="to_membership_id"
					placeholder="Type a name or email…"
					options={memberOptions}
					value={form.values.to_membership_id}
					onValueChange={(v) => {
						form.values.to_membership_id = v;
						form.validateField('to_membership_id');
					}}
					onInput={(q) => (memberQuery = q)}
					loading={search.isFetching}
					emptyState={memberQuery.length < 2
						? 'Type at least two characters'
						: 'No memberships match'}
					required
					error={form.errors.to_membership_id}
					hint="Search by first name, last name, or email."
				/>

				<label class="stack stack-tight">
					<span class="label">Reason (optional)</span>
					<textarea
						name="reason"
						bind:value={form.values.reason}
						rows={3}
						maxlength={500}
						class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
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
