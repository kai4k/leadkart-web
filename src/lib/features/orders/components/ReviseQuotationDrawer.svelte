<!--
	ReviseQuotationDrawer — full-width side drawer hosting the
	OrderItemsEditor + a notes textarea. Pre-populates rows from the
	order's current_items so editors start from the latest state.
	POST /v1/orders/{id}/revise on submit.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Alert, Button, Drawer } from '#lib/components/ui/index.ts';
	import { TextField } from '#lib/components/form/index.ts';
	import { useForm } from '#lib/hooks/index.ts';
	import {
		reviseQuotationRequestSchema,
		type ReviseQuotationRequest,
		type OrderDto
	} from '#lib/features/orders/schemas.ts';
	import { reviseQuotationMutation } from '#lib/features/orders/queries.ts';
	import OrderItemsEditor, {
		type BatchCatalogueEntry,
		type DraftItem
	} from './OrderItemsEditor.svelte';
	import { ValidationError, describeError } from '#lib/api/errors.ts';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

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

	const reviseM = reviseQuotationMutation();
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, reviseM);

	function seedRows(): DraftItem[] {
		return order.current_items.map((it) => ({
			product_id: it.product_id,
			batch_id: it.batch_id,
			quantity: it.quantity,
			unit_price: it.unit_price,
			discount_percentage: it.discount_percentage ?? 0
		}));
	}

	const form = useForm(
		reviseQuotationRequestSchema,
		{
			items: untrack(() => seedRows()),
			notes: ''
		},
		{ open: () => open }
	);

	/**
	 * `OrderItemsEditor` requires `DraftItem[]` (discount_percentage:
	 * number, non-optional). The form's input type tracks the schema's
	 * Zod *input* shape where `.default(0)` makes discount_percentage
	 * optional. Runtime values always carry a number — `seedRows` fills
	 * `?? 0` and the editor itself only ever sets numbers — so the
	 * narrowing is safe. We use a paired get/set binding so the editor
	 * still mutates `form.values.items` in place.
	 */
	const itemsBinding = {
		get items(): DraftItem[] {
			return form.values.items as DraftItem[];
		},
		set items(next: DraftItem[]) {
			form.values.items = next;
		}
	};

	// Re-seed the form whenever the drawer opens with a fresh order.
	$effect(() => {
		if (open) {
			form.values.items = seedRows();
			form.values.notes = '';
			form.clearErrors();
		}
	});

	/**
	 * Items-level error surface — extracted from `form.errors` because
	 * Zod's flattened fieldErrors keys array failures under `items` (or
	 * `items.0.unit_price` for row-level), but the items editor is a
	 * single composite widget so a single Alert above the editor is the
	 * canonical UX.
	 */
	const itemsError = $derived.by(() => {
		const direct = form.errors.items;
		if (direct) return direct;
		const rowEntry = Object.entries(form.errors).find(([k]) => k.startsWith('items'));
		return rowEntry?.[1] ?? null;
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values: ReviseQuotationRequest, current) => {
			try {
				await reviseM.mutateAsync({ id: order.id, ...values });
			} catch (err) {
				// ValidationError → form.errors (handled by useForm).
				// Map every other typed subclass to a human banner.
				if (err instanceof ValidationError) throw err;
				if (!current()) return;
				form.bannerError = describeError(err, {
					fallback: 'Failed to revise. Please try again.',
					status: {
						403: "You don't have permission to revise quotations.",
						404: 'This order was deleted or moved.',
						409: 'This order was revised by someone else — reload and try again.'
					}
				});
				return;
			}
			if (!current()) return;
			onOpenChange(false);
		});
	}
</script>

<Drawer.Root bind:open busy={form.isSubmitting} {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title class="h5 text-base">Revise quotation</Drawer.Title>
			<p class="body-sm text-muted-foreground">
				Edits create a new revision; previous revisions remain on file.
			</p>
		</Drawer.Header>
		<form id="revise-quotation-form" onsubmit={onSubmit}>
			<Drawer.Body>
				{#if form.bannerError}
					<Alert variant="destructive" title="Failed to revise">{form.bannerError}</Alert>
				{/if}

				{#if itemsError}
					<Alert variant="destructive" title="Items invalid">{itemsError}</Alert>
				{/if}

				<div class="stack stack-relaxed">
					<OrderItemsEditor
						bind:items={itemsBinding.items}
						{catalogue}
						currency={order.currency}
						onSearch={onSearchCatalogue}
					/>

					<TextField
						label="Notes (optional)"
						name="notes"
						bind:value={form.values.notes}
						placeholder="Explain why the revision was needed."
						data-testid="revise-notes"
					/>
				</div>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Close>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
					{/snippet}
				</Drawer.Close>
				<Button
					type="submit"
					form="revise-quotation-form"
					loading={form.isSubmitting}
					data-testid="revise-submit"
				>
					Save revision
				</Button>
			</Drawer.Footer>
		</form>
	</Drawer.Content>
</Drawer.Root>
