<script lang="ts">
	import { Drawer, Button, Alert, Badge } from '$ui';
	import { Icon, X } from '$icons';
	import { bulkUploadCommitMutation, bulkUploadPreviewMutation } from '$features/inventory/queries';
	import type { BulkUploadPreview, BulkUploadResult } from '$features/inventory/schemas';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	type Step = 'upload' | 'preview' | 'done';

	let step: Step = $state('upload');
	let file: File | null = $state(null);
	let preview: BulkUploadPreview | null = $state(null);
	let result: BulkUploadResult | null = $state(null);
	let errMsg: string | null = $state(null);

	const previewMutation = bulkUploadPreviewMutation();
	const commitMutation = bulkUploadCommitMutation();

	function reset() {
		step = 'upload';
		file = null;
		preview = null;
		result = null;
		errMsg = null;
	}

	$effect(() => {
		if (!open) reset();
	});

	function onFile(e: Event) {
		const target = e.target as HTMLInputElement;
		const f = target.files?.[0] ?? null;
		file = f;
	}

	async function doPreview() {
		if (!file) return;
		errMsg = null;
		previewMutation.mutate(file, {
			onSuccess: (p) => {
				preview = p;
				step = 'preview';
			},
			onError: (err) => {
				errMsg = err instanceof Error ? err.message : 'Failed to preview the file';
			}
		});
	}

	async function doCommit() {
		if (!file) return;
		errMsg = null;
		commitMutation.mutate(
			{ file, upsert_by: 'sku' },
			{
				onSuccess: (r) => {
					result = r;
					step = 'done';
				},
				onError: (err) => {
					errMsg = err instanceof Error ? err.message : 'Failed to commit the upload';
				}
			}
		);
	}

	function back() {
		step = 'upload';
		preview = null;
	}

	function close() {
		onOpenChange(false);
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Bulk upload items</h2>
				<p class="caption text-fg-muted">
					CSV with one row per SKU. Existing rows are upserted by SKU.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
					<Icon icon={X} size="sm" />
				</button>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			{#if step === 'upload'}
				<div class="stack stack-relaxed">
					<label class="stack stack-tight">
						<span class="label">CSV file</span>
						<input
							type="file"
							accept=".csv,text/csv"
							onchange={onFile}
							class="glass-input rounded-md px-3 py-2 text-sm"
							data-testid="bulk-upload-file"
						/>
					</label>
					{#if errMsg}<Alert variant="danger">{errMsg}</Alert>{/if}
				</div>
			{:else if step === 'preview' && preview}
				<div class="stack stack-relaxed">
					<div class="cluster cluster-tight">
						<Badge variant="info" style="soft">{preview.total_rows} rows</Badge>
						{#if preview.errors.length > 0}
							<Badge variant="danger" style="soft">{preview.errors.length} errors</Badge>
						{/if}
					</div>

					{#if preview.errors.length > 0}
						<Alert variant="warning" title="Some rows have problems">
							<ul style="margin:0;padding-left:1rem;">
								{#each preview.errors.slice(0, 5) as err (err.row_number + err.field)}
									<li class="caption">
										Row {err.row_number} — <code>{err.field}</code>: {err.message}
									</li>
								{/each}
								{#if preview.errors.length > 5}
									<li class="caption text-fg-muted">…and {preview.errors.length - 5} more</li>
								{/if}
							</ul>
						</Alert>
					{/if}

					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm" data-testid="bulk-upload-preview-table">
							<thead>
								<tr class="border-border border-b">
									<th class="caption px-2 py-2">SKU</th>
									<th class="caption px-2 py-2">Name</th>
									<th class="caption px-2 py-2">Stock</th>
									<th class="caption px-2 py-2">Action</th>
								</tr>
							</thead>
							<tbody>
								{#each preview.rows.slice(0, 20) as row, i (i)}
									<tr class="border-border border-b">
										<td class="px-2 py-2"><code>{row.sku ?? ''}</code></td>
										<td class="px-2 py-2">{row.name ?? ''}</td>
										<td class="px-2 py-2">{row.current_stock ?? ''}</td>
										<td class="px-2 py-2">
											{#if row.__action === 'update'}
												<Badge variant="info" style="soft" size="sm">Update</Badge>
											{:else}
												<Badge variant="success" style="soft" size="sm">Insert</Badge>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if errMsg}<Alert variant="danger">{errMsg}</Alert>{/if}
				</div>
			{:else if step === 'done' && result}
				<div class="stack stack-relaxed">
					<Alert variant="success" title="Upload complete">
						Inserted {result.inserted}, updated {result.updated}{result.failed > 0
							? `, ${result.failed} failed`
							: ''}.
					</Alert>
					{#if result.errors.length > 0}
						<Alert variant="warning" title="Some rows failed">
							<ul style="margin:0;padding-left:1rem;">
								{#each result.errors.slice(0, 10) as err, i (i)}
									<li class="caption">
										Row {err.row_number}{err.field ? ` — ${err.field}` : ''}: {err.message}
									</li>
								{/each}
							</ul>
						</Alert>
					{/if}
				</div>
			{/if}
		</Drawer.Body>
		<Drawer.Footer>
			{#if step === 'upload'}
				<Drawer.Close>
					<Button variant="ghost">Cancel</Button>
				</Drawer.Close>
				<Button onclick={doPreview} disabled={!file} loading={previewMutation.isPending}>
					Preview
				</Button>
			{:else if step === 'preview'}
				<Button variant="ghost" onclick={back}>Back</Button>
				<Button
					onclick={doCommit}
					loading={commitMutation.isPending}
					data-testid="bulk-upload-commit"
				>
					Commit upload
				</Button>
			{:else}
				<Button onclick={close}>Done</Button>
			{/if}
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
