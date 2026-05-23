<script lang="ts">
	/**
	 * Tree — root of a hierarchical disclosure list.
	 *
	 * Renders the `role="tree"` container; nested TreeNode children
	 * recursively render the hierarchy with their own `role="treeitem"`
	 * + aria-expanded handling.
	 *
	 * Industry refs: VSCode explorer, GitHub repo file tree, macOS Finder
	 * list view, WAI-ARIA APG TreeView pattern.
	 */
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	type Props = {
		'aria-label'?: string;
		class?: string;
		children: Snippet;
	};

	let { 'aria-label': ariaLabel, class: className = '', children }: Props = $props();
</script>

<ul role="tree" aria-label={ariaLabel} class={cn('stack stack-tight', className)}>
	{@render children()}
</ul>
