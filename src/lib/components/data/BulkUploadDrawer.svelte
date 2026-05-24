<!-- src/lib/components/data/BulkUploadDrawer.svelte -->
<script lang="ts" module>
	export interface BulkUploadError {
		row_number: number;
		field: string;
		code?: string;
		message: string;
	}

	export interface BulkUploadPreviewShape {
		total_rows: number;
		rows: Record<string, unknown>[];
		errors: BulkUploadError[];
	}

	export interface BulkUploadResultShape {
		inserted: number;
		updated: number;
		failed: number;
		errors: BulkUploadError[];
	}

	export interface BulkUploadOption {
		value: string;
		label: string;
	}
</script>

<script
	lang="ts"
	generics="TPreview extends BulkUploadPreviewShape, TResult extends BulkUploadResultShape"
>
	import { Drawer, Button, Alert, Badge, Stepper } from '$ui';
	import type { StepperState } from '$ui';
	import { Icon, Upload, CheckCircle2, X, Trash2 } from '$icons';
	import { ApiError } from '$api/errors';

	/**
	 * BulkUploadDrawer — generic three-step (upload → preview → commit)
	 * drawer. Lifted out of the per-feature implementation so leads /
	 * inventory / orders share one widget.
	 *
	 * Generic over preview + result types so feature consumers can
	 * narrow the rendered fields (e.g. extra "inserted-as-deduped"
	 * column on the result page) by passing typed `previewFn` and
	 * `commitFn` callbacks.
	 */

	type Step = 'upload' | 'preview' | 'result';

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		title: string;
		description?: string;
		accept?: string;
		previewFn: (file: File) => Promise<TPreview>;
		commitFn: (file: File, opts?: { upsert_by?: string }) => Promise<TResult>;
		upsertOptions?: BulkUploadOption[];
		onComplete?: (result: TResult) => void;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		accept = '.csv,.xlsx',
		previewFn,
		commitFn,
		upsertOptions,
		onComplete
	}: Props = $props();

	import { untrack } from 'svelte';

	let step: Step = $state('upload');
	let file: File | null = $state(null);
	let dragOver = $state(false);
	// `$state<T>(null)` infers `T | null`; assigning typed parameter via `as` keeps narrowing.
	let preview = $state<TPreview | null>(null);
	let result = $state<TResult | null>(null);
	// Initial upsert default is read once at mount; subsequent prop changes
	// don't retroactively reset the user's selection. `untrack` silences
	// the "captures initial value" warning for that intentional behaviour.
	const defaultUpsert = untrack(() => upsertOptions?.[0]?.value ?? 'none');
	let upsertBy: string = $state(defaultUpsert);
	let previewLoading = $state(false);
	let commitLoading = $state(false);
	let previewError: string | null = $state(null);
	let commitError: string | null = $state(null);

	let fileInput: HTMLInputElement | null = $state(null);

	function resetAll() {
		step = 'upload';
		file = null;
		preview = null;
		result = null;
		upsertBy = defaultUpsert;
		previewError = null;
		commitError = null;
		if (fileInput) fileInput.value = '';
	}

	$effect(() => {
		if (!open) resetAll();
	});

	function acceptsFile(name: string): boolean {
		const exts = accept
			.split(',')
			.map((s) => s.trim().toLowerCase())
			.filter((s) => s.startsWith('.'));
		const lower = name.toLowerCase();
		return exts.some((ext) => lower.endsWith(ext));
	}

	function pickFile(f: File | null | undefined) {
		if (!f) return;
		if (!acceptsFile(f.name)) return;
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
		previewLoading = true;
		previewError = null;
		try {
			const p = await previewFn(file);
			preview = p;
			step = 'preview';
		} catch (err) {
			previewError = err instanceof ApiError ? err.message : 'Preview failed.';
		} finally {
			previewLoading = false;
		}
	}

	async function runCommit() {
		if (!file) return;
		commitLoading = true;
		commitError = null;
		try {
			const opts = upsertOptions ? { upsert_by: upsertBy } : undefined;
			const r = await commitFn(file, opts);
			result = r;
			step = 'result';
			onComplete?.(r);
		} catch (err) {
			commitError = err instanceof ApiError ? err.message : 'Commit failed.';
		} finally {
			commitLoading = false;
		}
	}

	function done() {
		onOpenChange(false);
	}

	function fileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	const previewValidCount = $derived(
		preview ? Math.max(0, preview.total_rows - preview.errors.length) : 0
	);
	const previewAllInvalid = $derived(
		preview !== null && preview.total_rows > 0 && preview.errors.length >= preview.total_rows
	);
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">{title}</h2>
				{#if description}
					<p class="caption text-fg-muted">{description}</p>
				{/if}
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close">
					<Icon icon={X} size="sm" />
				</button>
			</Drawer.Close>
		</Drawer.Header>

		<Drawer.Body>
			{@const stepIndex = step === 'upload' ? 0 : step === 'preview' ? 1 : 2}
			{@const stepState = (i: number): StepperState =>
				i < stepIndex ? 'complete' : i === stepIndex ? 'current' : 'pending'}
			<div class="mb-6">
				<Stepper.Root ariaLabel="Upload progress">
					<Stepper.Step index={1} label="Upload" state={stepState(0)} />
					<Stepper.Step index={2} label="Preview" state={stepState(1)} />
					<Stepper.Step index={3} label="Result" state={stepState(2)} last />
				</Stepper.Root>
			</div>

			{#if step === 'upload'}
				<div class="stack stack-relaxed">
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
								Drop a file here, or
								<button
									type="button"
									class="text-primary hover:underline"
									onclick={() => fileInput?.click()}>browse</button
								>
							</p>
							<p class="caption text-fg-subtle">{accept}</p>
							<input
								bind:this={fileInput}
								type="file"
								{accept}
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

					{#if upsertOptions && upsertOptions.length > 0}
						<label class="stack stack-tight">
							<span class="label">Upsert mode</span>
							<select
								bind:value={upsertBy}
								class="glass-input body-sm text-fg rounded-md px-3 py-2"
							>
								{#each upsertOptions as opt (opt.value)}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</label>
					{/if}

					{#if previewError}
						<Alert variant="danger">{previewError}</Alert>
					{/if}
				</div>
			{:else if step === 'preview' && preview}
				<div class="stack stack-relaxed">
					<div class="cluster cluster-tight">
						<Badge variant="info" appearance="soft">{preview.total_rows} total</Badge>
						<Badge variant="success" appearance="soft">{previewValidCount} valid</Badge>
						{#if preview.errors.length > 0}
							<Badge variant="danger" appearance="soft">{preview.errors.length} errors</Badge>
						{/if}
					</div>

					{#if preview.errors.length > 0}
						<div class="border-border max-h-64 overflow-auto rounded-md border">
							<table class="w-full text-start">
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
								<pre class="caption text-fg p-3 whitespace-pre-wrap">{JSON.stringify(
										preview.rows.slice(0, 50),
										null,
										2
									)}</pre>
							</div>
						</details>
					{/if}

					{#if commitError}
						<Alert variant="danger">{commitError}</Alert>
					{/if}
				</div>
			{:else if step === 'result' && result}
				<div class="stack stack-relaxed text-center">
					<div class="text-success-700 mx-auto inline-flex">
						<Icon icon={CheckCircle2} size="xl" />
					</div>
					<h3 class="h5">Upload complete</h3>
					<div class="cluster cluster-tight justify-center">
						<Badge variant="success" appearance="soft">{result.inserted} inserted</Badge>
						<Badge variant="info" appearance="soft">{result.updated} updated</Badge>
						{#if result.failed > 0}
							<Badge variant="danger" appearance="soft">{result.failed} failed</Badge>
						{/if}
					</div>
					{#if result.errors.length > 0}
						<div class="border-border max-h-64 overflow-auto rounded-md border text-start">
							<table class="w-full text-start">
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
				<Button onclick={runPreview} disabled={!file || previewLoading} loading={previewLoading}>
					Preview
				</Button>
			{:else if step === 'preview'}
				<Button variant="ghost" onclick={resetAll}>
					<Icon icon={X} size="xs" /> Re-upload
				</Button>
				<Button
					onclick={runCommit}
					disabled={!preview || preview.total_rows === 0 || commitLoading || previewAllInvalid}
					loading={commitLoading}
				>
					Commit upload
				</Button>
			{:else}
				<Button onclick={done}>Done</Button>
			{/if}
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
