<!--
	ReviseQuotationDrawer — full-width side drawer hosting the
	OrderItemsEditor + a notes textarea. Pre-populates rows from the
	order's current_items so editors start from the latest state.
	POST /v1/orders/{id}/revise on submit.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Alert, Button, Drawer } from '$ui';
	import { TextField } from '$form';
	import { reviseQuotationRequestSchema } from '$features/orders/schemas';
	import { reviseQuotationMutation } from '$features/orders/queries';
	import OrderItemsEditor, {
		type BatchCatalogueEntry,
		type DraftItem
	} from './OrderItemsEditor.svelte';
	import type { OrderDto } from '$features/orders/schemas';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	type Props = {
		order: OrderDto;
		open: boolean;
		onOpenChange: (open: boolean) => void;
		catalogue: ReadonlyArray<BatchCatalogueEntry>;
		onSearchCatalogue?: (query: string) => void;
	};
	let {
		order,
		open = $bindable(false),
		onOpenChange,
		catalogue,
		onSearchCatalogue
	}: Props = $props();

	const reviseM = reviseQuotationMutation(untrack(() => order.id));

	function seedRows(): DraftItem[] {
		return order.current_items.map((it) => ({
			product_id: it.product_id,
			batch_id: it.batch_id,
			quantity: it.quantity,
			unit_price: it.unit_price,
			discount_percentage: it.discount_percentage ?? 0
		}));
	}

	let draftItems: DraftItem[] = $state(untrack(() => seedRows()));
	let notes = $state('');
	let bannerError: string | null = $state(null);
	let itemsError: string | null = $state(null);
	let isSubmitting = $state(false);

	// Seed the editor whenever the drawer opens with a fresh order.
	$effect(() => {
		if (open) {
			draftItems = seedRows();
			notes = '';
			bannerError = null;
			itemsError = null;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		bannerError = null;
		itemsError = null;

		const result = reviseQuotationRequestSchema.safeParse({
			items: draftItems,
			notes: notes || undefined
		});
		if (!result.success) {
			const flat = result.error.flatten();
			const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
			itemsError = fieldErrors.items?.[0] ?? null;
			if (!itemsError) bannerError = flat.formErrors[0] ?? 'Invalid revision';
			return;
		}

		isSubmitting = true;
		await new Promise<void>((resolve) => {
			reviseM.mutate(result.data, {
				onSuccess: () => {
					onOpenChange(false);
					resolve();
				},
				onError: (err) => {
					if (err instanceof ValidationError) {
						// Try mapping field errors to the items array; otherwise
						// fall back to a banner with a generic message.
						const itemsField =
							err.fields.items ??
							Object.entries(err.fields).find(([k]) => k.startsWith('items'))?.[1];
						if (itemsField) {
							itemsError = itemsField;
							bannerError = null;
						} else {
							bannerError = 'The server rejected the revision.';
						}
					} else if (err instanceof ConflictError) {
						bannerError =
							err.detail || 'This order was revised by someone else — reload and try again.';
					} else if (err instanceof AuthError) {
						bannerError =
							err.status === 403
								? "You don't have permission to revise quotations."
								: 'Your session expired. Sign in again.';
					} else if (err instanceof NotFoundError) {
						bannerError = 'This order was deleted or moved.';
					} else if (err instanceof NetworkError) {
						bannerError = 'Check your network connection and try again.';
					} else {
						bannerError = 'Failed to revise. Please try again.';
					}
					resolve();
				},
				onSettled: () => {
					isSubmitting = false;
				}
			});
		});
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<h2 class="h5">Revise quotation</h2>
			<p class="body-sm text-fg-muted">
				Edits create a new revision; previous revisions remain on file.
			</p>
		</Drawer.Header>
		<form id="revise-quotation-form" onsubmit={handleSubmit}>
			<Drawer.Body>
				{#if bannerError}
					<Alert variant="danger" title="Failed to revise">{bannerError}</Alert>
				{/if}

				{#if itemsError}
					<Alert variant="danger" title="Items invalid">{itemsError}</Alert>
				{/if}

				<div class="stack stack-relaxed">
					<OrderItemsEditor
						bind:items={draftItems}
						{catalogue}
						currency={order.currency}
						onSearch={onSearchCatalogue}
					/>

					<TextField
						label="Notes (optional)"
						name="notes"
						bind:value={notes}
						placeholder="Explain why the revision was needed."
						data-testid="revise-notes"
					/>
				</div>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Close>
					<Button variant="ghost" disabled={isSubmitting}>Cancel</Button>
				</Drawer.Close>
				<Button
					type="submit"
					form="revise-quotation-form"
					loading={isSubmitting}
					data-testid="revise-submit"
				>
					Save revision
				</Button>
			</Drawer.Footer>
		</form>
	</Drawer.Content>
</Drawer.Root>
