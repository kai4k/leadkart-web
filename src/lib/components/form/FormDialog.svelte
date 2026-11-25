<script lang="ts" generics="S extends AnyObjectSchema, R = void">
	import { _ } from 'svelte-i18n';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import FormSurfaceForm from './FormSurfaceForm.svelte';
	import {
		createFormSurface,
		type AnyObjectSchema,
		type FormSurfaceProps
	} from './form-surface.svelte.ts';

	/**
	 * FormDialog: a short form in a centred dialog (the same behaviour as FormSheet: reset on open, busy veto, one
	 * banner, leave guard). The dialog is the `material-milk`; header and footer add no surface of their own.
	 * `size` is the Dialog's named size (`md` 32rem, `lg` 48rem), never a `max-w-*` class.
	 */
	let {
		open = $bindable(false),
		onOpenChange,
		title,
		description,
		submitLabel,
		submitVariant = 'default',
		schema,
		initial,
		onSubmit,
		fields,
		formId,
		size = 'md',
		guardLeave = true,
		closeOnSuccess = true,
		validateOn,
		errorLines,
		done
	}: FormSurfaceProps<S, R> = $props();

	const surface = createFormSurface<S, R>(() => ({
		open,
		onOpenChange,
		schema,
		initial,
		onSubmit,
		guardLeave,
		closeOnSuccess,
		validateOn,
		errorLines
	}));
	const form = $derived(surface.form);
</script>

<Dialog.Root
	bind:open
	busy={form.isSubmitting}
	hold={surface.holdsClose}
	onHeld={surface.ask}
	{onOpenChange}
>
	<Dialog.Content {size}>
		<Dialog.Header class="border-b border-border pe-14">
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}<Dialog.Description>{description}</Dialog.Description>{/if}
		</Dialog.Header>
		<Dialog.Body>
			{#if done && surface.result}
				{@render done(surface.result.value, { again: surface.again })}
			{:else}
				<FormSurfaceForm
					{form}
					{formId}
					onsubmit={surface.submit}
					resetKey={surface.resetKey}
					{fields}
				/>
			{/if}
		</Dialog.Body>
		{#if !(done && surface.result)}
			<Dialog.Footer class="border-t border-border">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" disabled={form.isSubmitting}
							>{$_('common.cancel')}</Button
						>
					{/snippet}
				</Dialog.Close>
				<Button type="submit" form={formId} variant={submitVariant} loading={form.isSubmitting}
					>{submitLabel}</Button
				>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- unsaved input: every way out asks first (an alert dialog, opaque over the dialog); "Keep editing" has focus -->
<ConfirmDialog
	bind:open={() => surface.asking, (v) => (v ? surface.ask() : surface.keepEditing())}
	title={$_('form.discard.title')}
	description={$_('form.discard.description')}
	cancelLabel={$_('form.discard.keep')}
	confirmLabel={$_('form.discard.confirm')}
	variant="danger"
	onConfirm={() => {
		surface.discard();
		open = false;
	}}
/>
