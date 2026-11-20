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
	import { Icon, UploadCloud, X } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { cn } from '#lib/utils/cn.ts';

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

	const uid = $props.id();
	const fieldId = $derived(id ?? `dropzone-${uid}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	let isDragOver = $state(false);
	let localError = $state<string | null>(null);
	let inputEl: HTMLInputElement | null = $state(null);

	const localErrorId = $derived(`${fieldId}-localerror`);
	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null, localError ? localErrorId : null]
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

<Field.Field class={className}>
	<Field.Label for={fieldId} class={srLabel ? 'sr-only' : undefined}>{label}</Field.Label>

	<input
		bind:this={inputEl}
		id={fieldId}
		type="file"
		class="sr-only"
		tabindex="-1"
		{accept}
		{multiple}
		{disabled}
		aria-describedby={describedBy}
		aria-invalid={error || localError ? 'true' : undefined}
		onchange={onChange}
	/>

	{#if hasFiles}
		<div
			class={cn(
				'flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3',
				disabled && 'opacity-50',
				(error || localError) && 'border-destructive'
			)}
		>
			<Icon icon={UploadCloud} size="md" class="mt-0.5 shrink-0 text-primary" />
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				{#each files as f, i (`${f.name}-${i}`)}
					<div class="min-w-0">
						<p class="truncate text-sm text-foreground">{f.name}</p>
						<p class="text-sm text-muted-foreground">{formatBytes(f.size)}</p>
					</div>
				{/each}
			</div>
			<div class="flex gap-1">
				<Button variant="ghost" size="sm" onclick={() => inputEl?.click()} {disabled}>
					Replace
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					class="text-muted-foreground"
					aria-label="Remove file"
					onclick={clearFiles}
					{disabled}
				>
					<Icon icon={X} size="sm" />
				</Button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			data-drag-over={isDragOver ? 'true' : undefined}
			class={cn(
				'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 transition-colors duration-200',
				'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none',
				'disabled:cursor-not-allowed disabled:opacity-50',
				error || localError
					? 'border-destructive bg-card'
					: isDragOver
						? 'border-primary bg-primary-soft'
						: 'border-input bg-card hover:bg-muted'
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
				class={cn(isDragOver ? 'text-primary' : 'text-muted-foreground')}
			/>
			<p class="text-sm font-medium text-foreground">{placeholder}</p>
			{#if hint}
				<p class="text-sm text-muted-foreground">{hint}</p>
			{/if}
		</button>
	{/if}

	{#if hint && hasFiles}
		<Field.Description id={hintId}>{hint}</Field.Description>
	{:else if hint}
		<span id={hintId} class="sr-only">{hint}</span>
	{/if}

	{#if error}
		<Field.Error id={errorId}>{error}</Field.Error>
	{/if}
	{#if localError}
		<Field.Error id={localErrorId}>{localError}</Field.Error>
	{/if}
</Field.Field>
