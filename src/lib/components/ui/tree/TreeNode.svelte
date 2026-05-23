<script lang="ts">
	/**
	 * TreeNode — a single recursive node in a Tree.
	 *
	 * Renders a row with optional chevron toggle + optional icon + label.
	 * Children (passed via `children` snippet) render the subtree below
	 * when expanded. Click row → onClick; click chevron → onToggle.
	 *
	 * Keyboard: ArrowRight expands (or moves to first child); ArrowLeft
	 * collapses (or moves to parent — handled by parent recursion);
	 * Space/Enter triggers onClick.
	 */
	import { ChevronRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		expanded?: boolean;
		selected?: boolean;
		disabled?: boolean;
		onClick?: () => void;
		onToggle?: (expanded: boolean) => void;
		/** Visual indent step in rem; defaults to 1.25 (1 level). */
		level?: number;
		children?: Snippet;
		class?: string;
	};

	let {
		label,
		icon: IconComp,
		expanded = $bindable(false),
		selected = false,
		disabled = false,
		onClick,
		onToggle,
		level = 0,
		children,
		class: className = ''
	}: Props = $props();

	const hasChildren = $derived(!!children);

	function toggle() {
		if (disabled) return;
		expanded = !expanded;
		onToggle?.(expanded);
	}

	function handleRowKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') {
			if (hasChildren && !expanded) {
				e.preventDefault();
				toggle();
			}
		} else if (e.key === 'ArrowLeft') {
			if (hasChildren && expanded) {
				e.preventDefault();
				toggle();
			}
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onClick?.();
		}
	}

	const indentStyle = $derived(`padding-inline-start: calc(${level} * 1.25rem)`);
</script>

<li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={selected}>
	<div
		role="button"
		tabindex={disabled ? -1 : 0}
		class={cn(
			'flex items-center gap-1.5 rounded-md py-1.5 pr-2',
			'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none',
			selected ? 'bg-primary-soft text-primary' : 'text-fg hover:bg-bg-muted',
			disabled && 'is-disabled',
			className
		)}
		style={indentStyle}
		onclick={() => onClick?.()}
		onkeydown={handleRowKey}
		aria-disabled={disabled ? 'true' : undefined}
	>
		{#if hasChildren}
			<button
				type="button"
				class={cn(
					'text-fg-subtle hover:text-fg flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
					'focus-visible:ring-focus-ring focus-visible:ring-2 focus-visible:outline-none'
				)}
				aria-label={expanded ? 'Collapse' : 'Expand'}
				tabindex="-1"
				onclick={(e) => {
					e.stopPropagation();
					toggle();
				}}
			>
				<ChevronRight
					size={14}
					class={cn('transition-transform duration-150', expanded && 'rotate-90')}
					aria-hidden="true"
				/>
			</button>
		{:else}
			<span class="inline-block h-5 w-5 flex-shrink-0" aria-hidden="true"></span>
		{/if}

		{#if IconComp}
			<span class="text-fg-muted flex-shrink-0" aria-hidden="true">
				<IconComp size={16} />
			</span>
		{/if}

		<span class="body-sm truncate-1">{label}</span>
	</div>

	{#if hasChildren && expanded}
		<ul role="group" class="stack stack-tight mt-1">
			{@render children?.()}
		</ul>
	{/if}
</li>
