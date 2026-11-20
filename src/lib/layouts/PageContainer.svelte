<script lang="ts">
	/**
	 * PageContainer: the page's horizontal padding and width cap, both from `layouts.css`
	 * (`--shell-page-pad-x`, and `--shell-content-max` = `--page-width-2xl` for `contentWidth=default`,
	 * none for `fluid`). Pages put their `PageHeader` and content inside it; nothing else caps width.
	 */
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="mx-auto w-full max-w-(--shell-content-max) px-(--shell-page-pad-x) pb-5">
	{@render children()}
</div>
