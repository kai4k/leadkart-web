<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Dialog, Button, Alert } from '$ui';
	import { NumberInput, RadioGroup, RadioItem } from '$form';
	import { useForm } from '#lib/hooks/use-form.svelte.ts';
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
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, mutation);

	const initial: CreateMovementRequest = {
		batch_id: undefined,
		delta: 0,
		reason: 'correction' as StockMovementReason,
		note: ''
	};

	const form = useForm(createMovementRequestSchema, initial, {
		open: () => open,
		validateOn: 'blur'
	});

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
		await form.submit(e, async (values, current) => {
			const cleaned: CreateMovementRequest = { ...values, batch_id: batch.id };
			if (cleaned.note === '') cleaned.note = undefined;
			await mutation.mutateAsync({ productId, body: cleaned });
			if (!current()) return;
			onOpenChange(false);
		});
	}
</script>

<Dialog.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Dialog.Content size="xl">
		<Dialog.Header>
			<div class="stack stack-tight">
				<Dialog.Title class="h5 text-base">Adjust stock</Dialog.Title>
				{#if batch}
					<p class="caption text-muted-foreground">
						Batch <code>{batch.batch_number}</code>
					</p>
				{/if}
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<form id="adjust-stock-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="stack stack-tight">
						<span class="label text-foreground">Current available</span>
						<input
							type="number"
							readonly
							value={currentAvailable}
							class="bg-card border border-border rounded-md body-sm text-foreground bg-muted rounded-md px-3 py-2"
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
					<span class="label text-foreground">Note (optional)</span>
					<textarea
						bind:value={form.values.note}
						maxlength={1000}
						rows={2}
						placeholder="Anything worth remembering for the audit trail…"
						class="bg-card border border-border rounded-md body-sm text-foreground w-full rounded-md px-3 py-2"
					></textarea>
				</label>

				<div class="border-border bg-muted rounded-md border px-3 py-2">
					<p class="caption text-muted-foreground">
						New balance: <strong class="text-foreground" data-testid="new-balance-preview"
							>{newBalance}</strong
						>
					</p>
				</div>

				{#if willNegative}
					<Alert variant="warning" role="note">
						This delta would drive the batch below zero. The server may reject it.
					</Alert>
				{/if}

				{#if form.bannerError}
					<Alert variant="destructive" title="Couldn't adjust stock">{form.bannerError}</Alert>
				{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
				{/snippet}
			</Dialog.Close>
			<Button type="submit" form="adjust-stock-form" loading={form.isSubmitting}>
				Apply adjustment
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
