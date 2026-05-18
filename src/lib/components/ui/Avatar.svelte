<script lang="ts" module>
	export type AvatarSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type Props = {
		initials: string;
		size?: AvatarSize;
		class?: string;
	};

	let { initials, size = 'md', class: className = '' }: Props = $props();

	const sizes: Record<AvatarSize, string> = {
		sm: 'inline-size-7 block-size-7 text-[var(--text-2xs)]',
		md: 'inline-size-10 block-size-10 text-sm',
		lg: 'inline-size-14 block-size-14 text-base'
	};
</script>

<span
	class={cn(
		'inline-flex items-center justify-center rounded-full font-medium uppercase',
		'bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg-muted))]',
		'text-[var(--color-primary)]',
		sizes[size],
		className
	)}
	aria-hidden="true"
>
	{initials}
</span>
