<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Progress from './Progress.svelte';

	const { Story } = defineMeta({
		title: 'UI/Progress',
		component: Progress,
		tags: ['autodocs']
	});
</script>

<Story name="Determinate (primary)">
	<div class="stack stack-loose" style="width: 360px;">
		<div class="stack stack-tight">
			<div class="flex justify-between">
				<span class="caption text-muted-foreground">Upload progress</span>
				<span class="caption text-foreground tabular-nums">25%</span>
			</div>
			<Progress value={25} label="Upload progress" />
		</div>
		<div class="stack stack-tight">
			<div class="flex justify-between">
				<span class="caption text-muted-foreground">Onboarding</span>
				<span class="caption text-foreground tabular-nums">60%</span>
			</div>
			<Progress value={60} label="Onboarding progress" />
		</div>
		<div class="stack stack-tight">
			<div class="flex justify-between">
				<span class="caption text-muted-foreground">Almost done</span>
				<span class="caption text-foreground tabular-nums">90%</span>
			</div>
			<Progress value={90} label="Process progress" />
		</div>
	</div>
</Story>

<Story name="Variant semantics">
	<div class="stack stack-loose" style="width: 360px;">
		<div class="stack stack-tight">
			<span class="caption text-muted-foreground">Primary (default)</span>
			<Progress value={50} variant="primary" />
		</div>
		<div class="stack stack-tight">
			<span class="caption text-success">Success — quota safe</span>
			<Progress value={45} variant="success" label="Quota usage" />
		</div>
		<div class="stack stack-tight">
			<span class="caption text-warning">Warning — approaching limit</span>
			<Progress value={78} variant="warning" label="Quota usage" />
		</div>
		<div class="stack stack-tight">
			<span class="caption text-destructive">Danger — over budget</span>
			<Progress value={94} variant="danger" label="Quota usage" />
		</div>
	</div>
</Story>

<Story name="Indeterminate">
	<div style="width: 360px;">
		<div class="stack stack-tight">
			<span class="caption text-muted-foreground">Fetching marketplace listings…</span>
			<Progress value={null} label="Loading" />
		</div>
	</div>
</Story>

<Story name="Custom min/max (5/10 onboarding steps)">
	<div style="width: 360px;">
		<div class="stack stack-tight">
			<div class="flex justify-between">
				<span class="caption text-muted-foreground">Onboarding</span>
				<span class="caption text-foreground tabular-nums">5 / 10 steps</span>
			</div>
			<Progress value={5} min={0} max={10} variant="primary" label="Onboarding" />
		</div>
	</div>
</Story>
