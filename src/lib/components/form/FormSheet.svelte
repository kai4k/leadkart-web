<script lang="ts" generics="S extends AnyObjectSchema, R = void">
	import { _ } from 'svelte-i18n';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import ConfirmDialog from '#lib/components/ui/ConfirmDialog.svelte';
	import FormSurfaceForm from './FormSurfaceForm.svelte';
	import {
		createFormSurface,
		type AnyObjectSchema,
		type FormSurfaceProps
	} from './form-surface.svelte.ts';

	/**
	 * FormSheet: a form in a side sheet (the create / edit / assign pattern). The sheet is the
	 * `material-pane`; header and footer are separated by opaque `border-border` hairlines and add no surface
	 * of their own (no glass on glass). The form resets from `initial()` on every open, the sheet refuses to
	 * close while the save is in flight (`busy`), one banner shows a form-level failure, field errors show on
	 * their fields (the first invalid one gets focus), and leaving the page with unsaved input asks first.
	 * The submit button is in the footer and points at the form by `formId`.
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

<Sheet.Root
	bind:open
	busy={form.isSubmitting}
	hold={surface.holdsClose}
	onHeld={surface.ask}
	{onOpenChange}
>
	<Sheet.Content {size}>
		<Sheet.Header class="border-b border-border pe-14">
			<Sheet.Title>{title}</Sheet.Title>
			{#if description}<Sheet.Description>{description}</Sheet.Description>{/if}
		</Sheet.Header>
		<Sheet.Body>
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
		</Sheet.Body>
		{#if !(done && surface.result)}
			<Sheet.Footer class="flex-row justify-end border-t border-border">
				<Sheet.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" disabled={form.isSubmitting}
							>{$_('common.cancel')}</Button
						>
					{/snippet}
				</Sheet.Close>
				<Button type="submit" form={formId} variant={submitVariant} loading={form.isSubmitting}
					>{submitLabel}</Button
				>
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<!-- unsaved input: every way out asks first (an alert dialog, opaque over the sheet); "Keep editing" has focus -->
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
