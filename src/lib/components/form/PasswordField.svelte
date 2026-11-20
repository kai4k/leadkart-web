<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Eye, EyeOff, Icon } from '#lib/icons/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import TextField from './TextField.svelte';

	/**
	 * PasswordField — TextField with a visibility toggle.
	 *
	 * Reduces typo-driven sign-in failures (NN/g forms research). The toggle is a button whose
	 * `aria-label` switches between "Show password" and "Hide password" and which carries
	 * `aria-pressed`, so a screen reader announces the state. The input type swaps between
	 * `password` and `text`.
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
		<Button
			variant="ghost"
			size="icon-sm"
			class="text-muted-foreground"
			aria-label={visible ? 'Hide password' : 'Show password'}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			<Icon icon={visible ? EyeOff : Eye} size="sm" />
		</Button>
	{/snippet}
</TextField>
