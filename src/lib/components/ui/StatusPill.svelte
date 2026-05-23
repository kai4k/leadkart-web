<script lang="ts" module>
	/**
	 * StatusPill — Linear/Asana-style status badge with optional inline picker.
	 *
	 * When `options` + `onChange` are provided, the pill renders as a clickable
	 * button (Badge + chevron) that opens a dropdown of all options. When the
	 * options array is omitted, it renders a static Badge with the variant
	 * inferred from the built-in semantic map (active/closed/pending/…).
	 *
	 * Industry refs: Linear status picker, GitHub issue state, Asana task
	 * status, Notion select-property inline picker.
	 */
	import type { BadgeVariant } from './Badge.svelte';

	export type StatusPillOption = {
		value: string;
		label: string;
		variant: BadgeVariant;
	};

	/**
	 * Built-in semantic map — common status names get a sensible variant
	 * even when the caller doesn't pass `options`. Lower-cases for match.
	 */
	const SEMANTIC_VARIANT_MAP: Record<string, BadgeVariant> = {
		active: 'success',
		enabled: 'success',
		approved: 'success',
		live: 'success',
		open: 'success',
		paid: 'success',
		complete: 'success',
		completed: 'success',
		success: 'success',
		won: 'success',

		pending: 'warning',
		processing: 'warning',
		review: 'warning',
		'in-review': 'warning',
		draft: 'warning',
		hold: 'warning',
		'on-hold': 'warning',

		failed: 'danger',
		error: 'danger',
		rejected: 'danger',
		cancelled: 'danger',
		canceled: 'danger',
		blocked: 'danger',
		lost: 'danger',
		expired: 'danger',
		overdue: 'danger',

		info: 'info',
		new: 'info',
		queued: 'info',

		closed: 'neutral',
		archived: 'neutral',
		inactive: 'neutral',
		disabled: 'neutral'
	};

	export function inferStatusVariant(value: string): BadgeVariant {
		return SEMANTIC_VARIANT_MAP[value.toLowerCase()] ?? 'neutral';
	}
</script>

<script lang="ts">
	import { Check, ChevronDown, Icon } from '$lib/icons';
	import { cn } from '$lib/utils/cn';
	import Badge from './Badge.svelte';
	import * as Dropdown from './dropdown';

	type Props = {
		value: string;
		options?: StatusPillOption[];
		onChange?: (value: string) => void;
		disabled?: boolean;
		class?: string;
	};

	let { value, options, onChange, disabled = false, class: className = '' }: Props = $props();

	const isInteractive = $derived(!!options && !!onChange && !disabled);

	const currentOption = $derived(options?.find((o) => o.value === value));
	const currentVariant = $derived(currentOption?.variant ?? inferStatusVariant(value));
	const currentLabel = $derived(currentOption?.label ?? value);
</script>

{#if isInteractive && options}
	<Dropdown.Root>
		<Dropdown.Trigger
			class={cn(
				'inline-flex items-center gap-1 rounded-full',
				'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
				'disabled:cursor-not-allowed disabled:opacity-60',
				className
			)}
			aria-label={`Status: ${currentLabel}. Click to change.`}
		>
			<Badge variant={currentVariant} style="soft">
				<span class="inline-flex items-center gap-1">
					<span>{currentLabel}</span>
					<Icon icon={ChevronDown} size="xs" />
				</span>
			</Badge>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			{#each options as opt (opt.value)}
				<Dropdown.Item onSelect={() => onChange?.(opt.value)}>
					<span class="inline-flex flex-1 items-center gap-2">
						<Badge variant={opt.variant} style="soft" size="sm">
							{opt.label}
						</Badge>
					</span>
					{#if opt.value === value}
						<Icon icon={Check} size="xs" class="text-primary" />
					{/if}
				</Dropdown.Item>
			{/each}
		</Dropdown.Menu>
	</Dropdown.Root>
{:else}
	<span class={className}>
		<Badge variant={currentVariant} style="soft">{currentLabel}</Badge>
	</span>
{/if}
