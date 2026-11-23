<script lang="ts">
	/**
	 * IdentityCell — who a row is about: an avatar, a name (a link when `href` is given) and an
	 * optional line under it. The avatar is decoration (`aria-hidden`; the name beside it is the
	 * accessible text), so an image has an empty `alt`. The name takes the colour of where it sits, so
	 * inside a `DataTable` `rowHref` link it is link-coloured: a primary cell never also passes `href`
	 * (two nested anchors are invalid).
	 */
	import { Avatar, avatarVariants } from '#lib/components/ui/avatar/index.ts';
	import { initials } from '#lib/utils/person-name.ts';
	import { cn } from '#lib/utils/cn.ts';

	type Props = {
		name: string;
		subtitle?: string;
		href?: string;
		size?: 'sm' | 'md';
		avatarUrl?: string | null;
	};
	let { name, subtitle, href, size = 'md', avatarUrl }: Props = $props();
</script>

<div class="flex min-w-0 items-center gap-3">
	{#if avatarUrl}
		<img
			src={avatarUrl}
			alt=""
			data-slot="avatar"
			aria-hidden="true"
			class={cn(avatarVariants({ size }), 'object-cover')}
		/>
	{:else}
		<Avatar {size} initials={initials(name)} />
	{/if}
	<div class="min-w-0">
		{#if href}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- the caller passes a resolved path -->
			<a
				{href}
				class="text-primary-text focus-visible:ring-ring block truncate rounded font-medium outline-none hover:underline focus-visible:ring-2"
				>{name}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{:else}
			<p class="truncate font-medium">{name}</p>
		{/if}
		{#if subtitle}
			<p class="text-muted-foreground truncate text-sm">{subtitle}</p>
		{/if}
	</div>
</div>
