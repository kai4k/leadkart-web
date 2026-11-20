<script lang="ts">
	/**
	 * Every form field in its three states (normal, invalid, disabled), with static demo content.
	 * Dev-only (the `(dev)` route group, English like the rest of the styleguide): no API calls.
	 * Used to LOOK at the fields in light/dark and every primary colour, and by the axe gate.
	 */
	import { CalendarDate } from '@internationalized/date';
	import {
		Combobox,
		DatePicker,
		DateRangePicker,
		FileDropZone,
		NumberInput,
		PasswordField,
		RadioGroup,
		RadioItem,
		Select,
		Switch,
		TagInput,
		TextareaField,
		TextField,
		type DateRange
	} from '#lib/components/form/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Checkbox } from '#lib/components/ui/checkbox/index.ts';

	const states = ['normal', 'invalid', 'disabled'] as const;
	type State = (typeof states)[number];
	const err = (s: State, message = 'This value is not valid.') =>
		s === 'invalid' ? message : null;

	const selectOptions = [
		{ value: 'new', label: 'New' },
		{ value: 'contacted', label: 'Contacted' },
		{ value: 'won', label: 'Won' }
	];
	const comboOptions = [
		{ value: 'asha', label: 'Asha Verma', description: 'Sales manager' },
		{ value: 'ravi', label: 'Ravi Nair', description: 'Sales executive' },
		{ value: 'meera', label: 'Meera Iyer', description: 'Team lead' },
		{ value: 'old', label: 'Former member', disabled: true }
	];

	let text = $state({ normal: 'Acme Pharma', invalid: 'Acme', disabled: 'Acme Pharma' });
	let password = $state({ normal: 'correct-horse', invalid: 'short', disabled: 'correct-horse' });
	let numbers = $state<Record<State, number | null>>({ normal: 12, invalid: -3, disabled: 12 });
	let notes = $state({
		normal: 'Call back on Monday.',
		invalid: '',
		disabled: 'Call back on Monday.'
	});
	let selects = $state({ normal: 'contacted', invalid: '', disabled: 'won' });
	let switches = $state({ normal: true, disabled: true });
	let radios = $state({ normal: 'email', invalid: '', disabled: 'email' });
	let checks = $state({ normal: true, invalid: false, disabled: true });
	let combos = $state<Record<State, string | null>>({
		normal: 'ravi',
		invalid: null,
		disabled: 'asha'
	});
	let dates = $state<Record<State, CalendarDate | undefined>>({
		normal: new CalendarDate(2026, 11, 20),
		invalid: undefined,
		disabled: new CalendarDate(2026, 11, 20)
	});
	let ranges = $state<Record<State, DateRange>>({
		normal: { start: new CalendarDate(2026, 11, 18), end: new CalendarDate(2026, 11, 24) },
		invalid: { start: undefined, end: undefined },
		disabled: { start: new CalendarDate(2026, 11, 18), end: new CalendarDate(2026, 11, 24) }
	});
	let tags = $state<Record<State, string[]>>({
		normal: ['gold', 'north'],
		invalid: ['x'],
		disabled: ['gold', 'north']
	});
	let files = $state<Record<State, File | File[] | null>>({
		normal: null,
		invalid: null,
		disabled: null
	});
</script>

{#snippet row(title: string, note: string | null = null)}
	<div class="stack stack-tight">
		<h3 class="h4">{title}</h3>
		{#if note}<p class="caption text-muted-foreground">{note}</p>{/if}
	</div>
{/snippet}

<section
	aria-labelledby="fields-heading"
	class="stack stack-loose rounded-xl border border-border bg-card p-6"
>
	<h2 id="fields-heading" class="h2">Fields</h2>
	<p class="body-base text-muted-foreground">
		Each field in its normal, invalid and disabled state. Static demo content, no API calls.
	</p>

	{@render row('TextField (hint and error)')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<TextField
				label="Company name"
				hint="As on the GST certificate."
				error={err(s, 'Enter the registered name.')}
				disabled={s === 'disabled'}
				bind:value={text[s]}
			/>
		{/each}
	</div>

	{@render row('PasswordField')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<PasswordField
				label="Password"
				hint="At least 12 characters."
				error={err(s, 'Use at least 12 characters.')}
				disabled={s === 'disabled'}
				bind:value={password[s]}
			/>
		{/each}
	</div>

	{@render row('NumberInput')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<NumberInput
				label="Quantity"
				hint="Whole units."
				error={err(s, 'Must be zero or more.')}
				disabled={s === 'disabled'}
				min={0}
				bind:value={numbers[s]}
			/>
		{/each}
	</div>

	{@render row('TextareaField')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<TextareaField
				label="Notes"
				name="notes-{s}"
				hint="Visible to your team."
				maxlength={200}
				error={err(s, 'Add a note.')}
				disabled={s === 'disabled'}
				bind:value={notes[s]}
			/>
		{/each}
	</div>

	{@render row('Select (native)')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<Select
				label="Status"
				hint="Where the lead is in the pipeline."
				placeholder="Choose a status"
				options={selectOptions}
				error={err(s, 'Choose a status.')}
				disabled={s === 'disabled'}
				bind:value={selects[s]}
			/>
		{/each}
	</div>

	{@render row('Switch', 'No error line: a switch is never invalid.')}
	<div class="grid gap-6 md:grid-cols-3">
		<Switch
			label="Email alerts"
			hint="Sent to the account address."
			bind:checked={switches.normal}
		/>
		<span aria-hidden="true"></span>
		<Switch
			label="Email alerts"
			hint="Sent to the account address."
			disabled
			bind:checked={switches.disabled}
		/>
	</div>

	{@render row('RadioGroup')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<RadioGroup
				label="Contact by"
				hint="How we reach you."
				error={err(s, 'Choose one.')}
				disabled={s === 'disabled'}
				name="contact-{s}"
				bind:value={radios[s]}
			>
				<RadioItem value="email" label="Email" />
				<RadioItem value="phone" label="Phone" hint="Business hours only." />
				<RadioItem value="post" label="Post" disabled />
			</RadioGroup>
		{/each}
	</div>

	{@render row('Checkbox', 'Composed from ui/checkbox and the field anatomy.')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<Field.Field orientation="horizontal" data-invalid={s === 'invalid' ? true : undefined}>
				<Checkbox
					id="check-{s}"
					aria-invalid={s === 'invalid' ? 'true' : undefined}
					disabled={s === 'disabled'}
					bind:checked={checks[s]}
				/>
				<Field.Content>
					<Field.Label for="check-{s}">I accept the terms</Field.Label>
					{#if s === 'invalid'}
						<Field.Error>You must accept to continue.</Field.Error>
					{:else}
						<Field.Description>Required to place the order.</Field.Description>
					{/if}
				</Field.Content>
			</Field.Field>
		{/each}
	</div>

	{@render row('Combobox', 'Open it to see the popover and the filter.')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<Combobox
				label="Assign to"
				hint="Who owns the lead."
				options={comboOptions}
				error={err(s, 'Pick an owner.')}
				disabled={s === 'disabled'}
				bind:value={combos[s]}
			/>
		{/each}
	</div>

	{@render row('DatePicker')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<DatePicker
				label="Follow-up date"
				hint="Reminder is sent that morning."
				error={err(s, 'Pick a date.')}
				disabled={s === 'disabled'}
				bind:value={dates[s]}
			/>
		{/each}
	</div>

	{@render row('DateRangePicker')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<DateRangePicker
				label="Period"
				hint="Inclusive of both days."
				error={err(s, 'Pick a start and an end.')}
				disabled={s === 'disabled'}
				bind:value={ranges[s]}
			/>
		{/each}
	</div>

	{@render row('TagInput')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<TagInput
				label="Tags"
				hint="Press Enter or comma to add."
				suggestions={['gold', 'north', 'retail']}
				error={err(s, 'Add at least two tags.')}
				disabled={s === 'disabled'}
				bind:value={tags[s]}
			/>
		{/each}
	</div>

	{@render row('FileDropZone')}
	<div class="grid gap-6 md:grid-cols-3">
		{#each states as s (s)}
			<FileDropZone
				label="Attachment"
				hint="CSV up to 5 MB."
				accept=".csv"
				error={err(s, 'Choose a file.')}
				disabled={s === 'disabled'}
				bind:value={files[s]}
			/>
		{/each}
	</div>
</section>
