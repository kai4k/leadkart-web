<script lang="ts">
	import { _ } from 'svelte-i18n';
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
	 * `password` and `text`. Shown as text it must not be capitalised, auto-corrected, spell-checked or
	 * learned by the keyboard, so those are off in both states.
	 */

	type Props = Omit<HTMLInputAttributes, 'class' | 'type' | 'value' | 'required' | 'maxlength'> & {
		label: string;
		srLabel?: boolean;
		hint?: string;
		error?: string | null;
		required?: boolean;
		maxlength?: number;
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
	let toggle: HTMLElement | null = $state(null);
	// A form that is reset (a saved password form clears itself) starts hidden again: the next password is never typed in clear.
	$effect(() => {
		const form = toggle?.closest('form');
		if (!form) return;
		const hide = () => (visible = false);
		form.addEventListener('reset', hide);
		return () => form.removeEventListener('reset', hide);
	});
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
	autocapitalize="none"
	autocorrect="off"
	spellcheck={false}
	{...rest}
>
	{#snippet trailing()}
		<Button
			bind:ref={toggle}
			variant="ghost"
			size="icon-sm"
			class="text-muted-foreground"
			aria-label={visible ? $_('form.password.hide') : $_('form.password.show')}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			<Icon icon={visible ? EyeOff : Eye} size="sm" />
		</Button>
	{/snippet}
</TextField>
