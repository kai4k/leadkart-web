<script lang="ts" module>
	/**
	 * FileDropZone — drag-and-drop file picker with native fallback.
	 *
	 * Industry refs: Filestack Pickr, react-dropzone, Linear's attachment
	 * UI, GitHub PR file upload. A dashed rectangle accepts drag-and-drop
	 * AND opens the native picker on click. Once a file is selected, the
	 * tile reads "filename · 23 KB" with a Replace button.
	 *
	 * Validates against `accept` (MIME pattern) and `maxSize` (bytes).
	 */
</script>

<script lang="ts">
	import { Icon, UploadCloud, X } from '$lib/icons';
	import { cn } from '$lib/utils/cn';

	type Props = {
		value: File | File[] | null;
		accept?: string;
		multiple?: boolean;
		maxSize?: number;
		disabled?: boolean;
		placeholder?: string;
		hint?: string;
		label: string;
		srLabel?: boolean;
		error?: string | null;
		id?: string;
		class?: string;
		onError?: (msg: string) => void;
	};

	let {
		value = $bindable(null),
		accept,
		multiple = false,
		maxSize,
		disabled = false,
		placeholder = 'Drop file here or click to browse',
		hint,
		label,
		srLabel = false,
		error,
		id,
		class: className = '',
		onError
	}: Props = $props();

	const fieldId = $derived(id ?? `dropzone-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	let isDragOver = $state(false);
	let localError = $state<string | null>(null);
	let inputEl: HTMLInputElement | null = $state(null);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null, localError ? `${fieldId}-localerror` : null]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const files = $derived(value === null ? [] : Array.isArray(value) ? value : [value]);

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}

	function matchesAccept(file: File): boolean {
		if (!accept) return true;
		const patterns = accept.split(',').map((p) => p.trim());
		return patterns.some((pattern) => {
			if (pattern.startsWith('.')) {
				return file.name.toLowerCase().endsWith(pattern.toLowerCase());
			}
			if (pattern.endsWith('/*')) {
				const prefix = pattern.slice(0, -1);
				return file.type.startsWith(prefix);
			}
			return file.type === pattern;
		});
	}

	function setError(msg: string) {
		localError = msg;
		onError?.(msg);
	}

	function handleFiles(fileList: FileList | null) {
		localError = null;
		if (!fileList || fileList.length === 0) return;

		const accepted: File[] = [];
		for (const f of Array.from(fileList)) {
			if (!matchesAccept(f)) {
				setError(`"${f.name}" does not match the accepted file types`);
				return;
			}
			if (maxSize !== undefined && f.size > maxSize) {
				setError(`"${f.name}" exceeds maximum size of ${formatBytes(maxSize)}`);
				return;
			}
			accepted.push(f);
		}

		value = multiple ? accepted : (accepted[0] ?? null);
	}

	function clearFiles() {
		value = multiple ? [] : null;
		localError = null;
		if (inputEl) inputEl.value = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		if (disabled) return;
		handleFiles(e.dataTransfer?.files ?? null);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		if (disabled) return;
		isDragOver = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
	}

	function onChange(e: Event) {
		handleFiles((e.target as HTMLInputElement).files);
	}

	const hasFiles = $derived(files.length > 0);
</script>

<div class={cn('stack stack-tight', className)}>
	<span class={cn('label text-fg', srLabel && 'sr-only')} id="{fieldId}-label">
		{label}
	</span>

	<input
		bind:this={inputEl}
		id={fieldId}
		type="file"
		class="sr-only"
		{accept}
		{multiple}
		{disabled}
		aria-labelledby="{fieldId}-label"
		aria-describedby={describedBy}
		aria-invalid={error || localError ? 'true' : undefined}
		onchange={onChange}
	/>

	{#if hasFiles}
		<div
			class={cn(
				'glass-input flex items-start gap-3 px-4 py-3',
				disabled && 'is-disabled',
				(error || localError) && 'border-danger-500'
			)}
		>
			<Icon icon={UploadCloud} size="md" class="text-primary mt-0.5 flex-shrink-0" />
			<div class="stack stack-tight flex-1">
				{#each files as f, i (`${f.name}-${i}`)}
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0 flex-1">
							<p class="body-sm text-fg truncate-1">{f.name}</p>
							<p class="caption text-fg-muted">{formatBytes(f.size)}</p>
						</div>
					</div>
				{/each}
			</div>
			<div class="flex gap-1">
				<button
					type="button"
					class="text-fg-muted hover:text-fg label rounded-md px-2 py-1"
					onclick={() => inputEl?.click()}
					{disabled}
				>
					Replace
				</button>
				<button
					type="button"
					class="text-fg-subtle hover:text-fg rounded-md p-1"
					aria-label="Remove file"
					onclick={clearFiles}
					{disabled}
				>
					<Icon icon={X} size="sm" />
				</button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			data-drag-over={isDragOver ? 'true' : undefined}
			class={cn(
				'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10',
				'transition-colors duration-200',
				'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
				disabled && 'is-disabled',
				error || localError
					? 'border-danger-500 bg-danger-50'
					: isDragOver
						? 'border-primary bg-primary-soft'
						: 'border-border hover:border-border-strong bg-bg-subtle'
			)}
			onclick={() => inputEl?.click()}
			ondrop={onDrop}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			{disabled}
		>
			<Icon
				icon={UploadCloud}
				size="xl"
				class={cn(isDragOver ? 'text-primary' : 'text-fg-subtle')}
			/>
			<p class="body-sm text-fg font-medium">{placeholder}</p>
			{#if hint}
				<p class="caption text-fg-muted">{hint}</p>
			{/if}
		</button>
	{/if}

	{#if error}
		<p id={errorId} class="body-sm text-danger-700">{error}</p>
	{:else if localError}
		<p id="{fieldId}-localerror" class="body-sm text-danger-700">{localError}</p>
	{:else if hint && !hasFiles}
		<p id={hintId} class="sr-only">{hint}</p>
	{/if}
</div>
