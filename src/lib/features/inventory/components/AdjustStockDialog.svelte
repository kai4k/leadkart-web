<script lang="ts">
	import { Dialog, Button, Alert } from '$ui';
	import { NumberInput, RadioGroup, RadioItem } from '$form';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { adjustStockMutation } from '$features/inventory/queries';
	import {
		createMovementRequestSchema,
		type BatchDto,
		type CreateMovementRequest,
		type StockMovementReason
	} from '$features/inventory/schemas';
	import {
		MANUAL_ADJUSTMENT_REASONS,
		previewNewBalance,
		willGoNegative
	} from '$features/inventory/view-models';

	/**
	 * AdjustStockDialog — manual correction scoped to a specific batch.
	 *
	 * UX:
	 *   - Current available (readonly)
	 *   - Delta (signed integer)
	 *   - Reason (RadioGroup, only manual reasons — `inward` / `sale`
	 *     are server-driven, not user-pickable)
	 *   - Note (optional, max 1000 chars)
	 *   - Live "New balance: X" preview
	 *   - Inline warning if delta would drive negative
	 *
	 * Mutation is optimistic (see adjustStockMutation in queries.ts).
	 * 422 negative_stock_disallowed flows into the form's bannerError.
	 */

	type Props = {
		open: boolean;
		productId: string;
		batch: BatchDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), productId, batch, onOpenChange }: Props = $props();

	const mutation = adjustStockMutation();

	const initial: CreateMovementRequest = {
		batch_id: undefined,
		delta: 0,
		reason: 'correction' as StockMovementReason,
		note: ''
	};

	const form = useForm(createMovementRequestSchema, initial, { validateOn: 'blur' });

	$effect(() => {
		if (open && batch) {
			form.values = { batch_id: batch.id, delta: 0, reason: 'correction', note: '' };
			form.clearErrors();
		}
	});

	const currentAvailable = $derived(batch?.quantity_available ?? 0);
	const newBalance = $derived(previewNewBalance(currentAvailable, form.values.delta || 0));
	const willNegative = $derived(willGoNegative(currentAvailable, form.values.delta || 0));

	async function onSubmit(e: SubmitEvent) {
		if (!batch) return;
		await form.submit(e, async (values) => {
			const cleaned: CreateMovementRequest = { ...values, batch_id: batch.id };
			if (cleaned.note === '') cleaned.note = undefined;
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ productId, body: cleaned },
					{
						onSuccess: () => {
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
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h5">Adjust stock</h2>
				{#if batch}
					<p class="caption text-fg-muted">
						Batch <code>{batch.batch_number}</code>
					</p>
				{/if}
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<form id="adjust-stock-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="stack stack-tight">
						<span class="label text-fg">Current available</span>
						<input
							type="number"
							readonly
							value={currentAvailable}
							class="glass-input body-sm text-fg bg-bg-muted rounded-md px-3 py-2"
							aria-label="Current available"
						/>
					</label>
					<NumberInput
						label="Delta"
						bind:value={form.values.delta}
						step={1}
						placeholder="+5 or -10"
						error={form.errors.delta}
					/>
				</div>

				<RadioGroup
					label="Reason"
					bind:value={form.values.reason}
					orientation="horizontal"
					error={form.errors.reason}
				>
					{#each MANUAL_ADJUSTMENT_REASONS as r (r.value)}
						<RadioItem value={r.value} label={r.label} />
					{/each}
				</RadioGroup>

				<label class="stack stack-tight">
					<span class="label text-fg">Note (optional)</span>
					<textarea
						bind:value={form.values.note}
						maxlength={1000}
						rows={2}
						placeholder="Anything worth remembering for the audit trail…"
						class="glass-input body-sm text-fg w-full rounded-md px-3 py-2"
					></textarea>
				</label>

				<div class="border-border bg-bg-muted rounded-md border px-3 py-2">
					<p class="caption text-fg-muted">
						New balance: <strong class="text-fg" data-testid="new-balance-preview"
							>{newBalance}</strong
						>
					</p>
				</div>

				{#if willNegative}
					<Alert variant="warning">
						This delta would drive the batch below zero. The server may reject it.
					</Alert>
				{/if}

				{#if form.bannerError}
					<Alert variant="danger" title="Couldn't adjust stock">{form.bannerError}</Alert>
				{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Dialog.Close>
			<Button type="submit" form="adjust-stock-form" loading={form.isSubmitting}>
				Apply adjustment
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
