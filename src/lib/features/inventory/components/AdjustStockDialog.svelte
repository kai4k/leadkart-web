<script lang="ts">
	import { Dialog, Button, Alert } from '$ui';
	import { Select, type SelectOption } from '$form';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { adjustStockMutation } from '$features/inventory/queries';
	import {
		adjustStockSchema,
		adjustmentReasonSchema,
		type AdjustmentReason,
		type InventoryItemDto
	} from '$features/inventory/schemas';
	import {
		adjustmentReasonLabel,
		previewNewStock,
		willGoNegative
	} from '$features/inventory/view-models';

	/**
	 * Adjust Stock dialog — opened from the list row dropdown, detail
	 * page CTA, or by clicking the stock cell inline.
	 *
	 * UX:
	 *   - current stock readonly
	 *   - delta input (signed integer, placeholder shows `+` or `−`)
	 *   - reason dropdown (7 enum values)
	 *   - optional note (textarea)
	 *   - live "New stock will be: X" preview
	 *   - inline warning if delta would drive stock negative
	 *
	 * The mutation is optimistic — the dialog closes on submit and the
	 * stock-count update is patched into the cache immediately.
	 */

	type Props = {
		open: boolean;
		item: InventoryItemDto | null;
		onOpenChange: (open: boolean) => void;
	};
	let { open = $bindable(false), item, onOpenChange }: Props = $props();

	const mutation = adjustStockMutation();

	const form = useForm(
		adjustStockSchema,
		{
			delta: 0,
			reason: 'purchase' as AdjustmentReason,
			note: ''
		},
		{ validateOn: 'blur' }
	);

	// Reset form when the dialog opens or the item changes.
	$effect(() => {
		if (open && item) {
			form.values = { delta: 0, reason: 'purchase', note: '' };
			form.clearErrors();
		}
	});

	const REASON_OPTIONS: SelectOption[] = adjustmentReasonSchema.options.map((r) => ({
		value: r,
		label: adjustmentReasonLabel(r)
	}));

	const newStock = $derived(item ? previewNewStock(item.current_stock, form.values.delta || 0) : 0);
	const willNegative = $derived(
		item ? willGoNegative(item.current_stock, form.values.delta || 0) : false
	);

	async function onSubmit(e: SubmitEvent) {
		if (!item) return;
		await form.submit(e, async (values) => {
			const cleaned: typeof values = { ...values };
			if (cleaned.note === '') cleaned.note = undefined;
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: item.id, body: cleaned },
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
				{#if item}
					<p class="caption text-fg-muted">
						<code>{item.sku}</code> &middot; {item.name}
					</p>
				{/if}
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<form id="adjust-stock-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="stack stack-tight">
						<span class="label">Current stock</span>
						<input
							type="number"
							readonly
							value={item?.current_stock ?? 0}
							class="glass-input bg-bg-muted rounded-md px-3 py-2 text-sm"
							aria-label="Current stock"
						/>
					</label>
					<label class="stack stack-tight">
						<span class="label">Delta</span>
						<input
							type="number"
							name="delta"
							placeholder="+10 or −5"
							bind:value={form.values.delta}
							class="glass-input rounded-md px-3 py-2 text-sm"
							data-testid="adjust-delta"
							required
						/>
						{#if form.errors.delta}
							<span class="caption text-danger-700">{form.errors.delta}</span>
						{/if}
					</label>
				</div>

				<Select
					label="Reason"
					name="reason"
					options={REASON_OPTIONS}
					bind:value={form.values.reason}
					error={form.errors.reason}
				/>

				<label class="stack stack-tight">
					<span class="label">Note (optional)</span>
					<textarea
						bind:value={form.values.note}
						maxlength={2000}
						rows={2}
						placeholder="Anything worth remembering for the audit log…"
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>

				<div class="border-border bg-bg-muted rounded-md border px-3 py-2">
					<p class="caption text-fg-muted">
						New stock will be: <strong class="text-fg" data-testid="new-stock-preview"
							>{newStock}</strong
						>
					</p>
				</div>

				{#if willNegative}
					<Alert variant="warning">
						This delta would drive stock below zero. The server may reject it.
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
