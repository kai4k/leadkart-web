<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Stepper from '$ui/stepper';

	const { Story } = defineMeta({
		title: 'UI/Stepper',
		component: Stepper.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Bulk upload — step 2 of 3">
	<div style="width: 560px;">
		<Stepper.Root ariaLabel="Bulk upload">
			<Stepper.Step index={1} label="Upload" state="complete" />
			<Stepper.Step index={2} label="Preview" state="current" />
			<Stepper.Step index={3} label="Commit" state="pending" last />
		</Stepper.Root>
	</div>
</Story>

<Story name="All states">
	<div style="width: 720px;">
		<Stepper.Root ariaLabel="State demo">
			<Stepper.Step index={1} label="Complete" state="complete" />
			<Stepper.Step index={2} label="Current" state="current" />
			<Stepper.Step index={3} label="Error" state="error" />
			<Stepper.Step index={4} label="Pending" state="pending" last />
		</Stepper.Root>
	</div>
</Story>

<Story name="With optional step">
	<div style="width: 640px;">
		<Stepper.Root ariaLabel="Onboarding">
			<Stepper.Step index={1} label="Tenant profile" state="complete" />
			<Stepper.Step index={2} label="Add members" state="complete" />
			<Stepper.Step index={3} label="Connect API" state="current" optional />
			<Stepper.Step index={4} label="Launch" state="pending" last />
		</Stepper.Root>
	</div>
</Story>

<Story name="Long labels (truncation)">
	<div style="width: 480px;">
		<Stepper.Root ariaLabel="Long-label demo">
			<Stepper.Step index={1} label="Statutory documents collected" state="complete" />
			<Stepper.Step index={2} label="GST verification pending" state="current" />
			<Stepper.Step index={3} label="Marketplace activation" state="pending" last />
		</Stepper.Root>
	</div>
</Story>
