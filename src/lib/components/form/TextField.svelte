<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const textFieldInputVariants = cva(
		[
			'bg-bg-elevated border border-border rounded-md body-sm block w-full px-3 py-2 text-fg',
			'placeholder:text-fg-subtle',
			'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-60'
		],
		{
			variants: {
				error: {
					true: 'border-danger-500 focus-visible:ring-danger-500',
					false: 'focus-visible:ring-focus-ring'
				},
				hasLeading: {
					true: 'ps-10',
					false: ''
				},
				hasTrailing: {
					true: 'pe-10',
					false: ''
				}
			},
			defaultVariants: {
				error: false,
				hasLeading: false,
				hasTrailing: false
			}
		}
	);

	export type TextFieldInputVariants = VariantProps<typeof textFieldInputVariants>;
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	/**
	 * TextField — labelled text input primitive. Mandatory for every
	 * form field per WAI-ARIA Authoring Practices: every input MUST
	 * have a programmatically associated label. Plain `<input>` with
	 * placeholder-as-label is an a11y anti-pattern.
	 *
	 * Surfaces:
	 *   - label (required, visually hidden via `srLabel` if needed)
	 *   - hint (optional, body-sm subdued)
	 *   - error (optional, body-sm danger; aria-describedby linked)
	 *   - leading / trailing slots for icons or in-field actions
	 *
	 * Industry refs: shadcn-svelte Input, Material 3 Text Field,
	 * Salesforce Lightning, Atlassian Form, GitHub Primer.
	 */

	type Props = Omit<HTMLInputAttributes, 'class' | 'value'> & {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: string;
		leading?: Snippet;
		trailing?: Snippet;
		class?: string;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		id,
		value = $bindable(''),
		leading,
		trailing,
		class: className = '',
		...rest
	}: Props = $props();

	const fieldId = $derived(id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`);
	const hintId = $derived(`${fieldId}-hint`);
	const errorId = $derived(`${fieldId}-error`);

	const describedBy = $derived(
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={cn('stack stack-tight', className)}>
	<label for={fieldId} class={cn('label text-fg', srLabel && 'sr-only')}>
		{label}
	</label>

	<div class="relative">
		{#if leading}
			<span
				class="text-fg-subtle pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3"
				aria-hidden="true"
			>
				{@render leading()}
			</span>
		{/if}

		<input
			id={fieldId}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={describedBy}
			class={cn(
				textFieldInputVariants({
					error: Boolean(error),
					hasLeading: Boolean(leading),
					hasTrailing: Boolean(trailing)
				})
			)}
			{...rest}
		/>

		{#if trailing}
			<span class="absolute inset-y-0 end-0 flex items-center pe-2">
				{@render trailing()}
			</span>
		{/if}
	</div>

	{#if hint && !error}
		<p id={hintId} class="caption">{hint}</p>
	{/if}

	{#if error}
		<p id={errorId} role="alert" aria-live="polite" class="body-sm text-danger-700">
			{error}
		</p>
	{/if}
</div>
