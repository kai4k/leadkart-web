<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	/**
	 * ReassignDialog — confirm-style dialog for moving a lead's ownership.
	 *
	 * Typeahead Combobox backed by `GET /v1/users/search?q=` —
	 * the operator types two characters and picks a teammate from the
	 * dropdown. The membership UUID is the value that's POSTed; the
	 * label is the display name and the description the designation
	 * (Go's picker sends no email). Go matches the NAME only.
	 *
	 * Backend endpoint is documented in the CRM contracts spec; the BFF
	 * proxy forwards the request untouched, and the test suite mocks
	 * the response inline.
	 */
	import { Dialog, Button, Alert } from '$ui';
	import { Combobox, type ComboboxOption } from '$form';
	import { reassignLeadSchema } from '../schemas';
	import { useForm } from '#lib/hooks/use-form.svelte.ts';
	import { reassignLeadMutation } from '../queries';
	import { membershipSearchQuery, memberSearchReady } from '$features/users';

	type Props = {
		leadId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { leadId, open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = reassignLeadMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);
	const form = useForm(
		reassignLeadSchema,
		{ to_membership_id: '', reason: '' },
		{ open: () => open, validateOn: 'blur' }
	);

	let memberQuery = $state('');
	const search = membershipSearchQuery(() => memberQuery);

	const memberOptions = $derived<ComboboxOption[]>(
		(search.data?.members ?? []).map((m) => ({
			value: m.membership_id,
			label: m.display_name,
			description: m.designation
		}))
	);

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values, current) => {
			await mutation.mutateAsync({ id: leadId, req: values });
			if (!current()) return;
			form.reset();
			memberQuery = '';
			onOpenChange(false);
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Dialog.Content size="lg">
		<Dialog.Header>
			<div class="stack stack-tight">
				<Dialog.Title class="h5 text-base">Reassign lead</Dialog.Title>
				<p class="body-sm text-muted-foreground">
					Transfer ownership to another team member. The history tab keeps an audit trail.
				</p>
			</div>
		</Dialog.Header>

		<Dialog.Body>
			<form id="reassign-lead-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<Combobox
					label="New owner"
					name="to_membership_id"
					placeholder="Type a name…"
					options={memberOptions}
					value={form.values.to_membership_id}
					onValueChange={(v) => {
						form.values.to_membership_id = v;
						form.validateField('to_membership_id');
					}}
					onInput={(q) => (memberQuery = q)}
					loading={search.isFetching}
					emptyState={memberSearchReady(memberQuery)
						? 'No team member matches'
						: 'Type at least two characters'}
					required
					error={form.errors.to_membership_id}
					hint="Search by name."
				/>

				<label class="stack stack-tight">
					<span class="label">Reason (optional)</span>
					<textarea
						name="reason"
						bind:value={form.values.reason}
						rows={3}
						maxlength={500}
						class="bg-card border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
						placeholder="Why the lead is being moved"
					></textarea>
				</label>

				{#if search.isError}
					<Alert variant="destructive">The search could not be completed. Try again.</Alert>
				{/if}

				{#if form.bannerError}<Alert variant="destructive">{form.bannerError}</Alert>{/if}
			</form>
		</Dialog.Body>

		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="reassign-lead-form" loading={form.isSubmitting}>Reassign</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
