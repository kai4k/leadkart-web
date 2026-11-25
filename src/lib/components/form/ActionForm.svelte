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
	import { focusFirstInvalid, withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';
	import { fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import { fieldMessageText } from '#lib/utils/field-error-copy.ts';
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
		onResult,
		wide = false,
		resetOnSuccess = false,
		submitDisabled = false,
		bannerValues,
		secondary,
		tidy,
		validate,
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
		/**
		 * Field name -> a tidying function. On blur and again before submit the tidied text is written into the input, so
		 * what is shown is what is sent (`TIDY` of `utils/indian-formats.ts`).
		 */
		tidy?: Record<string, (text: string) => string>;
		/**
		 * What the form can tell before anything is sent: tidied values by field name -> the API's field CODE per refused
		 * field (shown through the same catalogue as the server's answer). Run on blur (for the blurred and the already
		 * blurred fields, never per keystroke) and on submit: with errors the submit is cancelled, nothing is sent, and
		 * focus goes to the first invalid field. The server stays the authority: its answer is rendered as ever.
		 */
		validate?: (values: Record<string, string>) => Record<string, string>;
		children: Snippet<[ActionFormSlot]>;
	} = $props();

	let formEl: HTMLFormElement | undefined = $state();
	let submitting = $state(false);

	const failure = $derived(readFailure(result));
	// what this side caught before sending: field -> API code; a server answer replaces it
	let clientErrors = $state<Record<string, string>>({});
	$effect(() => {
		void result;
		clientErrors = {};
	});
	// fields whose SERVER message was dropped because the text was edited into something that passes; a new result brings them back
	let dismissed = $state<Record<string, true>>({});
	$effect(() => {
		void result;
		dismissed = {};
	});
	const fieldError = (name: string) =>
		clientErrors[name] !== undefined
			? fieldMessageText(clientErrors[name], $_)
			: dismissed[name]
				? undefined
				: fieldText(failure, name, $_);
	/** What the failed submit typed (dotted names reach nested values: `address.street`). */
	const value = (name: string): unknown =>
		name
			.split('.')
			.reduce<unknown>(
				(v, part) =>
					v && typeof v === 'object' ? (v as Record<string, unknown>)[part] : undefined,
				result?.values
			);
	// A failure that names fields but leaves no control marked invalid (the form does not render them) must still say
	// so: decided by what the DOM shows after render, not by a hand-kept list of field names.
	let orphaned = $state(false);
	$effect(() => {
		const f = failure;
		const named =
			f && (Object.keys(f.fieldKeys).length > 0 || Object.keys(f.fieldMessages).length > 0);
		if (!f || f.formErrorKey || !named) {
			orphaned = false;
			return;
		}
		void tick().then(() => (orphaned = !formEl?.querySelector('[aria-invalid="true"]')));
	});
	const banner = $derived(
		failure?.formErrorKey
			? $_(failure.formErrorKey, { values: bannerValues })
			: orphaned
				? $_('auth.errors.validation')
				: null
	);

	// Dirty = what the form would send differs from what it held when it loaded (or was last saved).
	let baseline: string | null = null;
	// What the form would send is read from the DOM, which is not reactive: any user activity inside the form bumps
	// this, so the dirty flag (and with it the `beforeunload` listener) follows the form.
	let touched = $state(0);
	const touch = () => touched++;
	const snapshot = (): string | null =>
		formEl
			? JSON.stringify([...new FormData(formEl)].filter(([, v]) => typeof v === 'string'))
			: null;
	onMount(() => {
		baseline = snapshot();
	});
	// The baseline is read while the fieldset is disabled when the form starts read-only, and `FormData` omits disabled
	// controls: re-take it when `allowed` changes, so a form that becomes editable is not dirty before anyone typed.
	let seenAllowed: boolean | undefined;
	$effect(() => {
		const now = allowed;
		if (seenAllowed === undefined) seenAllowed = now; // the first run: onMount takes the baseline
		if (now === seenAllowed) return;
		seenAllowed = now;
		void tick().then(() => {
			baseline = snapshot();
			touch();
		});
	});
	$effect(() => {
		if (result?.success)
			void tick().then(() => {
				baseline = snapshot();
				touch();
			});
	});
	const formValues = (): Record<string, string> =>
		formEl
			? Object.fromEntries(
					[...new FormData(formEl)].filter(
						(entry): entry is [string, string] => typeof entry[1] === 'string'
					)
				)
			: {};
	/** Write the tidied text into the input(s) named (all of them when none is). */
	function applyTidy(only?: string): void {
		if (!tidy || !formEl) return;
		for (const [name, fn] of Object.entries(tidy)) {
			if (only !== undefined && name !== only) continue;
			const el = formEl.elements.namedItem(name);
			if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || el.disabled)
				continue;
			const next = fn(el.value);
			if (next === el.value) continue;
			el.value = next;
			el.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}
	// fields whose error may show before a submit: the ones the person has left
	const left: Record<string, true> = {};
	function onBlur(e: FocusEvent) {
		const el = e.target;
		if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || !el.name) return;
		applyTidy(el.name);
		if (!validate) return;
		left[el.name] = true;
		const found = validate(formValues());
		const next = { ...clientErrors };
		for (const name of Object.keys(left)) {
			if (found[name] !== undefined) next[name] = found[name];
			else delete next[name];
		}
		clientErrors = next;
	}
	// typing clears the stale message of THAT field; it is checked again on blur, never per keystroke
	function onInput(e: Event) {
		touch();
		const name = (e.target as HTMLInputElement | null)?.name;
		if (!name) return;
		if (name in clientErrors) {
			const { [name]: _cleared, ...rest } = clientErrors;
			clientErrors = rest;
		}
		// The server's message about this field goes once the text passes what this side can check. A form with no
		// `validate` cannot tell, so any edit counts as the person acting on it. A new answer brings it back if it still holds.
		if (!dismissed[name] && fieldText(failure, name, $_) !== undefined) {
			if (!validate || validate(formValues())[name] === undefined)
				dismissed = { ...dismissed, [name]: true };
		}
	}

	// A result that redirects is the save itself leaving the page (create role): that is not unsaved input.
	let leavingBySave = false;
	useLeaveGuard(() => {
		void touched;
		// A form nobody may save (`allowed` false) holds no input that could be lost: nothing to ask about.
		if (!guardLeave || !allowed || leavingBySave) return false;
		return baseline !== null && snapshot() !== baseline;
	});

	const submit = withFocusOnFailure(({ cancel }) => {
		// A number field holding text it could not read, or a number out of range: `novalidate` switches the browser's own
		// refusal off, and its model still holds the OLD value, which must not be sent under a visible error.
		if (formEl?.querySelector('[data-unreadable="true"]')) {
			cancel();
			void focusFirstInvalid(formEl);
			return;
		}
		applyTidy();
		if (validate) {
			const found = validate(formValues());
			if (Object.keys(found).length > 0) {
				cancel();
				clientErrors = found;
				for (const name of Object.keys(found)) left[name] = true;
				void focusFirstInvalid(formEl);
				return;
			}
		}
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
				if (resetOnSuccess && outcome.type === 'success') {
					formEl?.reset();
					touch();
				}
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
	oninput={onInput}
	onchange={touch}
	onclick={touch}
	onfocusin={touch}
	onfocusout={(e) => {
		touch();
		onBlur(e);
	}}
>
	{#if scoped}<ScopeContextField />{/if}
	<!-- A form the caller may not save shows its values and changes none of them (`disabled` reaches every control). -->
	<fieldset
		disabled={!allowed}
		aria-describedby={!allowed && disallowedReason ? `${id}-readonly` : undefined}
		class="m-0 min-w-0 border-0 p-0 contents"
	>
		{@render children({ submitting, fieldError, value })}
	</fieldset>
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
				size={wide ? 'lg' : 'md'}>{submitLabel}</Button
			>
		{:else if disallowedReason}
			<p id="{id}-readonly" class="caption text-muted-foreground">{disallowedReason}</p>
		{/if}
	</div>
</form>
