<script lang="ts">
	import { Drawer, Button, Alert, Badge } from '$ui';
	import { Icon, Upload, CheckCircle2, X, Trash2 } from '$icons';
	import { bulkUploadPreviewMutation, bulkUploadCommitMutation } from '$features/leads/queries';
	import type { BulkUploadPreview, BulkUploadResult } from '$features/leads/schemas';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	type Step = 'upload' | 'preview' | 'result';
	let step: Step = $state('upload');
	let file: File | null = $state(null);
	let dragOver = $state(false);
	let preview: BulkUploadPreview | null = $state(null);
	let result: BulkUploadResult | null = $state(null);
	let upsertBy: 'email' | 'phone' | 'none' = $state('none');

	const previewMutation = bulkUploadPreviewMutation();
	const commitMutation = bulkUploadCommitMutation();

	let fileInput: HTMLInputElement | null = $state(null);

	function resetAll() {
		step = 'upload';
		file = null;
		preview = null;
		result = null;
		upsertBy = 'none';
		if (fileInput) fileInput.value = '';
	}

	// Reset whenever the drawer closes so a re-open is fresh.
	$effect(() => {
		if (!open) resetAll();
	});

	function pickFile(f: File | null | undefined) {
		if (!f) return;
		const ok = /\.(csv|xlsx)$/i.test(f.name);
		if (!ok) return;
		file = f;
	}

	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		pickFile(input.files?.[0]);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const f = e.dataTransfer?.files?.[0];
		pickFile(f);
	}

	async function runPreview() {
		if (!file) return;
		previewMutation.mutate(file, {
			onSuccess: (p) => {
				preview = p;
				step = 'preview';
			}
		});
	}

	async function runCommit() {
		if (!file) return;
		commitMutation.mutate(
			{ file, upsertBy },
			{
				onSuccess: (r) => {
					result = r;
					step = 'result';
				}
			}
		);
	}

	function done() {
		onOpenChange(false);
	}

	function fileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Bulk upload leads</h2>
				<p class="caption text-fg-muted">
					Upload a CSV or Excel file. We'll preview rows and surface validation errors before
					anything is saved.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<!-- Stepper -->
			<ol class="cluster cluster-tight mb-6" style="list-style:none;padding:0;margin:0;">
				{#each [{ k: 'upload', label: '1. Upload' }, { k: 'preview', label: '2. Preview' }, { k: 'result', label: '3. Result' }] as s (s.k)}
					{@const active = step === s.k}
					<li class="cluster cluster-tight">
						<Badge variant={active ? 'brand' : 'neutral'} style="soft" size="sm">{s.label}</Badge>
					</li>
				{/each}
			</ol>

			{#if step === 'upload'}
				<div class="stack stack-relaxed">
					<!-- Drop zone -->
					<div
						role="presentation"
						ondragover={(e) => {
							e.preventDefault();
							dragOver = true;
						}}
						ondragleave={() => (dragOver = false)}
						ondrop={onDrop}
						class={[
							'border-border rounded-lg border-2 border-dashed px-6 py-12 text-center',
							'transition-colors duration-[var(--duration-fast)]',
							dragOver ? 'border-primary bg-primary-soft' : 'bg-bg-muted'
						]}
						data-testid="bulk-upload-dropzone"
					>
						<div class="stack stack-tight items-center">
							<Icon icon={Upload} size="lg" />
							<p class="body-sm text-fg-muted">
								Drop a CSV or Excel file here, or
								<button
									type="button"
									class="text-primary hover:underline"
									onclick={() => fileInput?.click()}>browse</button
								>
							</p>
							<input
								bind:this={fileInput}
								type="file"
								accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
								class="sr-only"
								onchange={onFileChange}
								data-testid="bulk-upload-input"
							/>
						</div>
					</div>

					{#if file}
						<div class="cluster cluster-spread border-border rounded-md border p-3">
							<div class="stack stack-tight">
								<p class="label text-fg">{file.name}</p>
								<p class="caption text-fg-muted">{fileSize(file.size)}</p>
							</div>
							<button
								type="button"
								class="hover:bg-bg-muted rounded-md p-1.5"
								aria-label="Remove file"
								onclick={() => {
									file = null;
									if (fileInput) fileInput.value = '';
								}}
							>
								<Icon icon={Trash2} size="sm" />
							</button>
						</div>
					{/if}

					<label class="stack stack-tight">
						<span class="label">Upsert mode</span>
						<select bind:value={upsertBy} class="glass-input rounded-md px-3 py-2 text-sm">
							<option value="none">Insert only (skip existing)</option>
							<option value="email">Upsert by email</option>
							<option value="phone">Upsert by phone</option>
						</select>
					</label>

					{#if previewMutation.isError}
						<Alert variant="danger">
							{previewMutation.error?.message ?? 'Preview failed. Try a different file.'}
						</Alert>
					{/if}
				</div>
			{:else if step === 'preview' && preview}
				<div class="stack stack-relaxed">
					<div class="cluster cluster-tight">
						<Badge variant="info" style="soft">{preview.total_rows} total</Badge>
						<Badge variant="success" style="soft"
							>{preview.total_rows - preview.errors.length} valid</Badge
						>
						{#if preview.errors.length > 0}
							<Badge variant="danger" style="soft">{preview.errors.length} errors</Badge>
						{/if}
					</div>

					{#if preview.errors.length > 0}
						<div
							class="border-border max-h-64 overflow-auto rounded-md border"
							data-testid="preview-errors"
						>
							<table class="w-full text-left">
								<thead class="bg-bg-muted">
									<tr>
										<th class="caption text-fg-muted px-3 py-2">Row</th>
										<th class="caption text-fg-muted px-3 py-2">Field</th>
										<th class="caption text-fg-muted px-3 py-2">Message</th>
									</tr>
								</thead>
								<tbody>
									{#each preview.errors as err (`${err.row_number}-${err.field}`)}
										<tr class="border-border border-t">
											<td class="caption text-fg px-3 py-2">#{err.row_number}</td>
											<td class="caption text-fg px-3 py-2">{err.field}</td>
											<td class="caption text-danger-700 px-3 py-2">{err.message}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					{#if preview.rows.length > 0}
						<details>
							<summary class="caption text-fg-muted cursor-pointer">
								Preview first {Math.min(preview.rows.length, 50)} rows
							</summary>
							<div class="border-border mt-2 max-h-64 overflow-auto rounded-md border">
								<pre class="caption text-fg p-3" style="white-space:pre-wrap;">{JSON.stringify(
										preview.rows.slice(0, 50),
										null,
										2
									)}</pre>
							</div>
						</details>
					{/if}

					{#if commitMutation.isError}
						<Alert variant="danger">
							{commitMutation.error?.message ?? 'Commit failed.'}
						</Alert>
					{/if}
				</div>
			{:else if step === 'result' && result}
				<div class="stack stack-relaxed text-center">
					<div class="text-success-700 mx-auto inline-flex">
						<Icon icon={CheckCircle2} size="xl" />
					</div>
					<h3 class="h5">Upload complete</h3>
					<div class="cluster cluster-tight justify-center">
						<Badge variant="success" style="soft">{result.inserted} inserted</Badge>
						<Badge variant="info" style="soft">{result.updated} updated</Badge>
						{#if result.failed > 0}
							<Badge variant="danger" style="soft">{result.failed} failed</Badge>
						{/if}
					</div>
					{#if result.errors.length > 0}
						<div class="border-border max-h-64 overflow-auto rounded-md border text-left">
							<table class="w-full text-left">
								<thead class="bg-bg-muted">
									<tr>
										<th class="caption text-fg-muted px-3 py-2">Row</th>
										<th class="caption text-fg-muted px-3 py-2">Message</th>
									</tr>
								</thead>
								<tbody>
									{#each result.errors as err (`${err.row_number}-${err.field}`)}
										<tr class="border-border border-t">
											<td class="caption text-fg px-3 py-2">#{err.row_number}</td>
											<td class="caption text-danger-700 px-3 py-2">{err.message}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}
		</Drawer.Body>
		<Drawer.Footer>
			{#if step === 'upload'}
				<Drawer.Close>
					<Button variant="ghost">Cancel</Button>
				</Drawer.Close>
				<Button
					onclick={runPreview}
					disabled={!file || previewMutation.isPending}
					loading={previewMutation.isPending}
				>
					Preview
				</Button>
			{:else if step === 'preview'}
				<Button variant="ghost" onclick={resetAll}>
					<Icon icon={X} size="xs" /> Re-upload
				</Button>
				<Button
					onclick={runCommit}
					disabled={!preview ||
						preview.total_rows === 0 ||
						commitMutation.isPending ||
						(preview && preview.errors.length === preview.total_rows)}
					loading={commitMutation.isPending}
				>
					Commit upload
				</Button>
			{:else}
				<Button onclick={done}>Done</Button>
			{/if}
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
