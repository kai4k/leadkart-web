<script lang="ts">
	import { Copy, Check, Icon } from '$icons';
	import { Button } from '$ui';

	type Props = {
		/** Text to copy to the clipboard. */
		value: string;
		/** Optional aria-label override; default 'Copy'. */
		label?: string;
		/** Size pass-through to Button. */
		size?: 'sm' | 'md';
	};

	let { value, label = 'Copy', size = 'sm' }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	async function copy() {
		if (!navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			/* silent fail — value is still visible to the user */
		}
	}
</script>

<Button variant="ghost" {size} aria-label={label} onclick={copy} class="!h-7 !w-7 !p-0">
	<Icon icon={copied ? Check : Copy} size="xs" />
</Button>
