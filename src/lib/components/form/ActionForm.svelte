<script lang="ts" module>
	/**
	 * What a form action returned, as `failForm` (`src/lib/server/form-action.ts`) and a success return
	 * shape it. The page's `form` prop is passed as is; nothing here changes the action's contract.
	 */
	export type ActionFormResult = {
		values?: Record<string, unknown>;
		fieldKeys?: Record<string, string>;
		fieldMessages?: Record<string, string>;
		formErrorKey?: string | null;
		success?: boolean;
	};

	/** What the form's fields get: the busy flag, the translated error of a field, the value a failed submit typed. */
	export type ActionFormSlot = {
		submitting: boolean;
		fieldError: (name: string) => string | undefined;
		value: (name: string) => unknown;
	};
</script>

<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { enhance, type ActionResult } from '$app/forms';
	import { _ } from 'svelte-i18n';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { useLeaveGuard } from '#lib/hooks/use-leave-guard.svelte.ts';
	import { withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';
	import { fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import FormOutcome from './FormOutcome.svelte';
	import ScopeContextField from './ScopeContextField.svelte';

	/**
	 * A `<form method="POST" use:enhance>` for a server form action: the one outcome line, the focus on
	 * the first invalid field, the submit button that shows loading and cannot be pressed twice, the
	 * permission-aware footer and the leave guard, so a page writes only its fields.
	 *
	 * Same concerns as `FormSheet` / `FormDialog` (`form-surface.svelte.ts`), same pieces: `FormOutcome`
	 * (the line), `focusFirstInvalid` (the focus), `fieldMessageText` (key / API code / sentence to
	 * text), `useLeaveGuard` (never in the way of a hard reset or sign-out). What differs is the
	 * transport: a surface runs a client mutation and holds its own field state (`useForm`); this one
	 * posts to the page's action, reads the failure the action returned (`result`, the page's `form`)
	 * and leaves the field state to the inputs.
	 *
	 * No surface of its own: the card (or page) around it provides the material.
	 */
	let {
		id,
		action,
		result,
		submitLabel,
		successMessage,
		allowed = true,
		disallowedReason,
		scoped = true,
		relaxed = false,
		guardLeave = false,
		isDirty,
		onResult,
		wide = false,
		resetOnSuccess = false,
		submitDisabled = false,
		bannerValues,
		secondary,
		children
	}: {
		id: string;
		/** e.g. `?/save`; the page's default action when omitted. */
		action?: string;
		/** The page's `form` prop. */
		result: ActionFormResult | null | undefined;
		submitLabel: string;
		/** The line shown after a saved result; a form that redirects on success passes none. */
		successMessage?: string;
		/** From the capabilities the server already provides; false shows `disallowedReason` instead of the button. */
		allowed?: boolean;
		disallowedReason?: string;
		/** Carry the tenant-context field (every form that posts to a scope-sensitive action). Pre-login forms pass false. */
		scoped?: boolean;
		/** The roomier gap between stacked cards (`stack-relaxed`). */
		relaxed?: boolean;
		/** Ask before leaving with unsaved input. Off for a form nobody loses by leaving (sign-in). */
		guardLeave?: boolean;
		/** Override of "what would be sent differs from what the form loaded with" (the default). */
		isDirty?: () => boolean;
		/** After the page applied the result: the escape hatch (the sign-in lockout countdown). */
		onResult?: (result: ActionResult) => void;
		/** After a saved result, clear the fields (a password form: nothing typed stays on screen). */
		resetOnSuccess?: boolean;
		/** A full-width large submit button (the auth cards). */
		wide?: boolean;
		/** Disable the submit button without it being busy (a lockout countdown). */
		submitDisabled?: boolean;
		/** Values for the banner's ICU placeholders (`{seconds}`). */
		bannerValues?: Record<string, string | number>;
		/** Buttons before the submit button (a Cancel link). */
		secondary?: Snippet;
		children: Snippet<[ActionFormSlot]>;
	} = $props();

	let formEl: HTMLFormElement | undefined = $state();
	let submitting = $state(false);

	const failure = $derived(readFailure(result));
	const fieldError = (name: string) => fieldText(failure, name, $_);
	/** What the failed submit typed (dotted names reach nested values: `address.street`). */
	const value = (name: string): unknown =>
		name
			.split('.')
			.reduce<unknown>(
				(v, part) =>
					v && typeof v === 'object' ? (v as Record<string, unknown>)[part] : undefined,
				result?.values
			);
	const banner = $derived(
		failure?.formErrorKey ? $_(failure.formErrorKey, { values: bannerValues }) : null
	);

	// Dirty = what the form would send differs from what it held when it loaded (or was last saved).
	let baseline: string | null = null;
	const snapshot = (): string | null =>
		formEl
			? JSON.stringify([...new FormData(formEl)].filter(([, v]) => typeof v === 'string'))
			: null;
	onMount(() => {
		baseline = snapshot();
	});
	$effect(() => {
		if (result?.success) void tick().then(() => (baseline = snapshot()));
	});
	// A result that redirects is the save itself leaving the page (create role): that is not unsaved input.
	let leavingBySave = false;
	useLeaveGuard(() => {
		if (!guardLeave || leavingBySave) return false;
		if (isDirty) return isDirty();
		return baseline !== null && snapshot() !== baseline;
	});

	const submit = withFocusOnFailure(({ cancel }) => {
		// the button is disabled while loading; this also covers Enter in a field and a second event before the repaint
		if (submitting) {
			cancel();
			return;
		}
		submitting = true;
		leavingBySave = false;
		return async ({ update, result: outcome }) => {
			try {
				if (outcome.type === 'redirect') leavingBySave = true;
				await update({ reset: false });
				if (resetOnSuccess && outcome.type === 'success') formEl?.reset();
				onResult?.(outcome);
			} finally {
				submitting = false;
			}
		};
	});
</script>

<form
	bind:this={formEl}
	{id}
	class={['stack', relaxed && 'stack-relaxed']}
	method="POST"
	{action}
	novalidate
	use:enhance={submit}
>
	{#if scoped}<ScopeContextField />{/if}
	{@render children({ submitting, fieldError, value })}
	<FormOutcome
		error={banner}
		success={successMessage === undefined ? undefined : result?.success ? successMessage : null}
	/>
	<div class="form-footer">
		{#if allowed}
			{@render secondary?.()}
			<Button
				type="submit"
				loading={submitting}
				disabled={submitDisabled}
				class={wide ? 'w-full' : undefined}
				size={wide ? 'lg' : 'default'}>{submitLabel}</Button
			>
		{:else if disallowedReason}
			<p class="caption text-muted-foreground">{disallowedReason}</p>
		{/if}
	</div>
</form>
