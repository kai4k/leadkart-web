<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Eye, EyeOff } from 'lucide-svelte';
	import TextField from './TextField.svelte';

	/**
	 * PasswordField — wraps TextField with a visibility toggle.
	 *
	 * Industry standard since 2019 (Auth0, Stripe, Slack, GitHub all
	 * have this). Reduces typo-driven login failures by ~25% in
	 * usability studies (NN/g Forms research).
	 *
	 * Toggle is a button with aria-label that switches between "Show
	 * password" and "Hide password" so screen readers announce state.
	 * Input type swaps between `password` and `text`.
	 */

	type Props = Omit<HTMLInputAttributes, 'class' | 'type' | 'value'> & {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		value?: string;
		class?: string;
	};

	let {
		label,
		srLabel = false,
		hint,
		error,
		value = $bindable(''),
		class: className = '',
		...rest
	}: Props = $props();

	let visible = $state(false);
</script>

<TextField
	{label}
	{srLabel}
	{hint}
	{error}
	bind:value
	class={className}
	type={visible ? 'text' : 'password'}
	autocomplete="current-password"
	{...rest}
>
	{#snippet trailing()}
		<button
			type="button"
			class="rounded-sm p-1.5 text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:outline-none"
			aria-label={visible ? 'Hide password' : 'Show password'}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			{#if visible}
				<EyeOff size={16} aria-hidden="true" />
			{:else}
				<Eye size={16} aria-hidden="true" />
			{/if}
		</button>
	{/snippet}
</TextField>
