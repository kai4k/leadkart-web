<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { Icon, CheckCircle2, AlertCircle, Upload } from '$icons';
	import { bulkUploadCommitMutation, bulkUploadPreviewMutation } from '$features/orders/queries';
	import { formatMoney } from '$features/orders/view-models';
	import type { BulkUploadPreview, BulkUploadResult } from '$features/orders/schemas';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	type Step = 'upload' | 'preview' | 'committed';
	let step: Step = $state('upload');
	let file: File | null = $state(null);
	let error: string | null = $state(null);
	let preview: BulkUploadPreview | null = $state(null);
	let result: BulkUploadResult | null = $state(null);

	const previewMutation = bulkUploadPreviewMutation();
	const commitMutation = bulkUploadCommitMutation();

	const isLoading = $derived(previewMutation.isPending || commitMutation.isPending);

	function onFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		file = target.files?.[0] ?? null;
		error = null;
	}

	function doPreview() {
		if (!file) {
			error = 'Pick a CSV file first';
			return;
		}
		error = null;
		previewMutation.mutate(file, {
			onSuccess: (p) => {
				preview = p;
				step = 'preview';
			},
			onError: (e) => {
				error = e instanceof Error ? e.message : 'Preview failed';
			}
		});
	}

	function doCommit() {
		if (!file) {
			error = 'File missing — please re-upload';
			step = 'upload';
			return;
		}
		error = null;
		commitMutation.mutate(
			{ file },
			{
				onSuccess: (r) => {
					result = r;
					step = 'committed';
				},
				onError: (e) => {
					error = e instanceof Error ? e.message : 'Commit failed';
				}
			}
		);
	}

	function resetAll() {
		step = 'upload';
		file = null;
		preview = null;
		result = null;
		error = null;
	}

	function onClose(o: boolean) {
		onOpenChange(o);
		if (!o) resetAll();
	}
</script>

<Drawer.Root bind:open onOpenChange={onClose}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Bulk upload orders</h2>
				<p class="caption text-fg-muted">
					Upload a CSV with one row per line item — group rows into orders by
					<code>order_external_id</code>.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if error}
				<Alert variant="danger">{error}</Alert>
			{/if}

			{#if step === 'upload'}
				<div class="stack stack-relaxed" data-testid="bulk-step-upload">
					<label
						class="border-border bg-bg-elevated flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed p-8 text-center"
					>
						<Icon icon={Upload} size="lg" />
						<span class="label text-fg">Drop a CSV here, or click to choose</span>
						<span class="caption text-fg-muted">
							Required columns: order_external_id, customer_name, sku, quantity, unit_price
						</span>
						<input
							type="file"
							accept=".csv,text/csv"
							class="sr-only"
							data-testid="bulk-file-input"
							onchange={onFileChange}
						/>
					</label>
					{#if file}
						<p class="caption text-fg" data-testid="bulk-file-selected">
							Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
						</p>
					{/if}
				</div>
			{:else if step === 'preview' && preview}
				<div class="stack stack-relaxed" data-testid="bulk-step-preview">
					<div class="cluster cluster-tight">
						<Icon icon={CheckCircle2} size="sm" />
						<span class="label text-fg">
							{preview.orders_preview.length} order(s), {preview.total_rows} line(s) parsed
						</span>
					</div>

					{#if preview.errors.length > 0}
						<Alert variant="warning" title={`${preview.errors.length} row error(s)`}>
							<ul class="caption mt-2 list-disc space-y-1 pl-5">
								{#each preview.errors.slice(0, 10) as err (err.row_number + err.field)}
									<li>
										Row {err.row_number} · <code>{err.field}</code>: {err.message}
									</li>
								{/each}
								{#if preview.errors.length > 10}
									<li class="text-fg-muted">…and {preview.errors.length - 10} more</li>
								{/if}
							</ul>
						</Alert>
					{/if}

					{#if preview.orders_preview.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full text-left text-sm">
								<thead>
									<tr class="border-border text-fg-muted border-b">
										<th class="px-2 py-2 text-xs uppercase">External ID</th>
										<th class="px-2 py-2 text-xs uppercase">Customer</th>
										<th class="px-2 py-2 text-right text-xs uppercase">Items</th>
										<th class="px-2 py-2 text-right text-xs uppercase">Subtotal</th>
										<th class="px-2 py-2 text-right text-xs uppercase">Total</th>
									</tr>
								</thead>
								<tbody>
									{#each preview.orders_preview.slice(0, 25) as row (row.order_external_id)}
										<tr class="border-border border-b">
											<td class="px-2 py-2"><code class="caption">{row.order_external_id}</code></td
											>
											<td class="px-2 py-2">{row.customer_name}</td>
											<td class="px-2 py-2 text-right">{row.line_item_count}</td>
											<td class="px-2 py-2 text-right">{formatMoney(row.subtotal)}</td>
											<td class="px-2 py-2 text-right">{formatMoney(row.total)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{:else if step === 'committed' && result}
				<div class="stack stack-relaxed" data-testid="bulk-step-committed">
					<div class="cluster cluster-tight">
						<Icon icon={CheckCircle2} size="md" />
						<span class="label text-fg">Import complete</span>
					</div>
					<ul class="caption text-fg list-disc pl-5">
						<li>{result.inserted} order(s) inserted</li>
						{#if result.updated > 0}<li>{result.updated} order(s) updated</li>{/if}
						{#if result.failed > 0}
							<li class="text-danger-700">
								<Icon icon={AlertCircle} size="xs" />
								{result.failed} row(s) failed
							</li>
						{/if}
					</ul>
				</div>
			{/if}
		</Drawer.Body>
		<Drawer.Footer>
			{#if step === 'upload'}
				<Drawer.Close>
					<Button variant="ghost">Cancel</Button>
				</Drawer.Close>
				<Button onclick={doPreview} loading={previewMutation.isPending} disabled={!file}>
					Preview
				</Button>
			{:else if step === 'preview'}
				<Button variant="ghost" onclick={resetAll} disabled={isLoading}>Start over</Button>
				<Button
					onclick={doCommit}
					loading={commitMutation.isPending}
					disabled={!preview || preview.orders_preview.length === 0}
				>
					Commit import
				</Button>
			{:else if step === 'committed'}
				<Drawer.Close>
					<Button>Done</Button>
				</Drawer.Close>
			{/if}
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
