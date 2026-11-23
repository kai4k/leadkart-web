<script lang="ts">
	/** BackLink — the "back to the list" link at the top of a detail page. */
	import { ArrowLeft, Icon } from '#lib/icons/index.ts';

	type Props = { href: string; label: string };
	let { href, label }: Props = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- the caller passes a resolved path -->
<a
	{href}
	class="text-primary-text hover:underline focus-visible:ring-ring inline-flex items-center gap-1 rounded text-sm outline-none focus-visible:ring-2"
>
	<Icon icon={ArrowLeft} size="sm" class="rtl:rotate-180" />{label}
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
