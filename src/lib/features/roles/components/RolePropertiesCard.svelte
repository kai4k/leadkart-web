<script lang="ts">
	import { Button, Card } from '$ui';
	import { NumberInput, TextField } from '#lib/components/form/index.ts';
	import { ValidationError } from '$api/errors';
	import { focusFirstInvalid } from '#lib/utils/focus-first-invalid.ts';
	import { clientProblems, serverProblems } from '#lib/hooks/unshown-banner.ts';
	import type { updateRoleMutation } from '../queries.ts';
	import {
		editRoleFormSchema,
		ROLE_LEVEL_MAX,
		ROLE_LEVEL_MIN,
		ROLE_NAME_MAX,
		ROLE_NAME_MIN
	} from '../schemas.ts';
	import type { RoleDto } from '../types.ts';

	/**
	 * RolePropertiesCard: the name and level of a role, on the role detail page.
	 *
	 * Checked before anything is sent, with the message on the field: to Go a blank name or an absent level means "no
	 * change" (it answers 204), so the page used to say "Saved." over a field that had not been saved, and `150`,
	 * `0` or `1.5` only ever produced a banner that named no field.
	 *
	 * The page owns the mutation (it resets it when the role on screen changes) and the one banner: this card reports to
	 * it through `onStart` / `onSaved` / `onFailed` / `onBanner`.
	 */
	type Props = {
		role: RoleDto;
		canUpdate: boolean;
		/** A save of this page is running (any of its three). */
		busy: boolean;
		mutation: ReturnType<typeof updateRoleMutation>;
		/** A save attempt begins: the page clears its banner. */
		onStart: () => void;
		onSaved: () => void;
		/** A failure that names no field of this card. */
		onFailed: (err: unknown) => void;
		/** A refusal on something this card does not render. */
		onBanner: (line: string | null) => void;
	};
	let { role, canUpdate, busy, mutation, onStart, onSaved, onFailed, onBanner }: Props = $props();

	let name = $state('');
	let hierarchyLevel = $state<number | null>(0);
	// what was refused, by field name: shown on the field, never as a banner over an unmarked form
	let fieldErrors = $state<Record<string, string>>({});
	let formEl: HTMLFormElement | undefined = $state();

	$effect(() => {
		name = role.name;
		hierarchyLevel = role.hierarchy_level;
	});
	// the messages belong to the role on screen
	$effect.pre(() => {
		void role.id;
		fieldErrors = {};
	});

	const dirty = $derived(name !== role.name || hierarchyLevel !== role.hierarchy_level);

	function save(e: SubmitEvent) {
		e.preventDefault();
		if (!canUpdate || busy) return;
		onStart();
		fieldErrors = {};
		const form = formEl ?? null;
		// the level field holds text it could not read (`1.5`, `150`): its model still has the old number, which must not be sent
		if (form?.querySelector('[data-unreadable="true"]')) {
			void focusFirstInvalid(form);
			return;
		}
		const parsed = editRoleFormSchema.safeParse({ name, hierarchy_level: hierarchyLevel });
		if (!parsed.success) {
			const found = clientProblems(parsed.error, form);
			fieldErrors = found.errors;
			onBanner(found.banner);
			void focusFirstInvalid(form);
			return;
		}
		mutation.mutate(
			{ id: role.id, req: parsed.data },
			{
				onSuccess: onSaved,
				onError: (err: unknown) => {
					// Go names the refused field (`name: too_long`): it goes on the field, anything else is the page's banner
					if (!(err instanceof ValidationError && err.hasFieldErrors)) return onFailed(err);
					const found = serverProblems(err.fields, err.code, form);
					fieldErrors = found.errors;
					onBanner(found.banner);
					void focusFirstInvalid(form);
				}
			}
		);
	}

	// editing a field drops its message; it is checked again on the next save
	function onInput(e: Event) {
		const field = e.target instanceof HTMLElement ? e.target.getAttribute('name') : null;
		if (!field || !(field in fieldErrors)) return;
		const { [field]: _cleared, ...rest } = fieldErrors;
		fieldErrors = rest;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Properties</Card.Title>
	</Card.Header>
	<Card.Content>
		<form
			bind:this={formEl}
			class="stack stack-relaxed"
			novalidate
			onsubmit={save}
			oninput={onInput}
		>
			<TextField
				label="Name"
				name="name"
				bind:value={name}
				required
				minlength={ROLE_NAME_MIN}
				maxlength={ROLE_NAME_MAX}
				disabled={!canUpdate}
				error={fieldErrors.name}
			/>
			<NumberInput
				label="Hierarchy level"
				name="hierarchy_level"
				bind:value={hierarchyLevel}
				required
				min={ROLE_LEVEL_MIN}
				max={ROLE_LEVEL_MAX}
				disabled={!canUpdate}
				error={fieldErrors.hierarchy_level}
			/>
		</form>
	</Card.Content>
	<Card.Footer>
		<!-- the card footer of this page (the same as its two sibling cards), so the form is submitted from here -->
		<Button
			disabled={!canUpdate || !dirty || busy}
			loading={busy}
			onclick={() => formEl?.requestSubmit()}>Save properties</Button
		>
	</Card.Footer>
</Card.Root>
