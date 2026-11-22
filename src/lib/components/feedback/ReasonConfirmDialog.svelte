<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import ConfirmDialog, {
		type ConfirmDialogVariant
	} from '#lib/components/ui/ConfirmDialog.svelte';
	import { Alert } from '#lib/components/ui/alert/index.ts';
	import { TextareaField, TextField } from '#lib/components/form/index.ts';
	import { describeReasonError, ValidationError } from '$api/errors';
	import { fieldErrorCopy } from '#lib/utils/field-error-copy.ts';
	import { focusFirstInvalid } from '#lib/utils/focus-first-invalid.ts';

	/**
	 * ReasonConfirmDialog: a confirmation that needs a typed reason (audited), and optionally the user typing a name to
	 * confirm (delete a role, mark a tenant for deletion). It is the `ConfirmDialog` (an alert dialog: focus starts on
	 * Cancel, an outside press does not dismiss it) with a reason field, an optional type-to-confirm field and one banner.
	 *
	 *   - Everything (reason, typed text, errors) is reset every time it opens.
	 *   - The confirm button is disabled while a required reason is blank, or while `confirmText` is set and the typed
	 *     text is not it (trimmed, NFC-normalised, case-sensitive).
	 *   - A rejection with a field error on `reason` shows under the field (`role="alert"`); anything else is the one
	 *     banner line from `describeError` (a conflict says `conflict`, a 403 or 404 says what happened to the `noun`).
	 *   - It closes itself when `onConfirm` resolves, and refuses to close while it runs. A result that lands after it was
	 *     closed or reopened changes nothing.
	 */
	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		title: string;
		description?: string;
		variant?: ConfirmDialogVariant;
		confirmLabel: string;
		reasonLabel?: string;
		/** Ask for a reason at all (default true). False for an action whose API takes none (delete a role). */
		askReason?: boolean;
		reasonRequired?: boolean;
		reasonMaxLength?: number;
		/** Type-to-confirm: the button stays disabled until the typed text is exactly this. */
		confirmText?: string;
		/** The banner lines, each a COMPLETE sentence from the catalogue (never built from fragments): 403, 404, 409, anything else. */
		messages: { failed: string; forbidden: string; notFound: string; conflict?: string };
		onConfirm: (reason: string) => Promise<void>;
		/** More content above the reason field (what will happen, a warning). */
		extra?: Snippet;
	};

	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		variant = 'danger',
		confirmLabel,
		reasonLabel,
		askReason = true,
		reasonRequired = true,
		reasonMaxLength = 500,
		confirmText,
		messages,
		onConfirm,
		extra
	}: Props = $props();

	let reason = $state('');
	let typed = $state('');
	let typedTouched = $state(false);
	let reasonError = $state<string | null>(null);
	let banner = $state<string | null>(null);
	let pending = $state(false);
	let generation = 0;
	let bodyEl: HTMLElement | undefined = $state();

	$effect.pre(() => {
		if (!open) return;
		untrack(() => {
			generation++;
			reason = '';
			typed = '';
			typedTouched = false;
			reasonError = null;
			banner = null;
			pending = false;
		});
	});

	/** Trimmed and Unicode-normalised on both sides (a pasted trailing space, a decomposed accent); still case-sensitive. */
	const sameText = (a: string, b: string) =>
		a.trim().normalize('NFC') === b.trim().normalize('NFC');
	const mismatch = $derived(
		confirmText !== undefined &&
			typedTouched &&
			typed.trim() !== '' &&
			!sameText(typed, confirmText)
	);

	const blocked = $derived(
		(askReason && reasonRequired && reason.trim() === '') ||
			(confirmText !== undefined && !sameText(typed, confirmText))
	);

	async function confirm() {
		if (blocked || pending) return;
		const mine = generation;
		pending = true;
		reasonError = null;
		banner = null;
		try {
			await onConfirm(reason.trim());
			if (mine === generation) onOpenChange(false);
		} catch (err) {
			if (mine !== generation) return;
			if (err instanceof ValidationError && err.fields.reason) {
				reasonError = fieldErrorCopy(err.fields.reason);
			} else {
				({ banner } = describeReasonError(err, {
					fallback: messages.failed,
					status: {
						403: messages.forbidden,
						404: messages.notFound,
						409: messages.conflict
					}
				}));
			}
			// the failure takes focus (the reason field, or the banner): a screen reader reads it where the user is
			void focusFirstInvalid(bodyEl);
		} finally {
			if (mine === generation) pending = false;
		}
	}
</script>

<ConfirmDialog
	bind:open
	{title}
	{description}
	{variant}
	{confirmLabel}
	loading={pending}
	confirmDisabled={blocked}
	{onOpenChange}
	onConfirm={confirm}
>
	{#snippet body()}
		<div bind:this={bodyEl} class="stack stack-relaxed">
			{@render extra?.()}
			{#if askReason}
				<TextareaField
					label={reasonLabel ?? $_('form.reason')}
					name="reason"
					rows={3}
					maxlength={reasonMaxLength}
					required={reasonRequired}
					bind:value={reason}
					error={reasonError}
				/>
			{/if}
			{#if confirmText !== undefined}
				<TextField
					label={$_('form.typeToConfirm', { values: { text: confirmText } })}
					name="confirm_text"
					autocomplete="off"
					hint={$_('form.typeToConfirmHint')}
					bind:value={typed}
					onblur={() => (typedTouched = true)}
					error={mismatch ? $_('form.errors.nameMismatch') : undefined}
				/>
			{/if}
			{#if banner}<Alert variant="destructive">{banner}</Alert>{/if}
		</div>
	{/snippet}
</ConfirmDialog>
