<script lang="ts">
	/**
	 * The theme customizer (Domiex structure): a right-hand sheet with one named radio group per
	 * axis of the `lk_ui` preferences. Every control writes ONE preference through the store, which
	 * sets the `<html data-*>` attribute at once and the cookie for the next server render; the page
	 * re-skins through static CSS, so nothing here injects a style or reloads. Groups come from
	 * `customizer-config.ts` (derived from the preference schema); what is irrelevant in the current
	 * state (L25) is not offered. Live changes are not announced: the page changing is the feedback,
	 * and the checked radio is what a screen reader reads.
	 */
	import { _ } from 'svelte-i18n';
	import { Button, Sheet } from '$ui';
	import { Icon, RotateCcw } from '$icons';
	import * as RadioGroup from '#lib/components/ui/radio-group/index.ts';
	import { cn } from '#lib/utils/cn.ts';
	import { getPreferences, type PreferenceKey } from '$features/preferences';
	import CustomizerTile from './CustomizerTile.svelte';
	import { effectiveValue, visibleGroups } from './customizer-config.ts';

	let {
		open = $bindable(false),
		onOpenChange
	}: { open?: boolean; onOpenChange?: (open: boolean) => void } = $props();

	const prefs = getPreferences();
	const groups = $derived(visibleGroups(prefs.all));

	// Below `lg` the layouts that need room cannot be chosen: their tiles stay in the group but
	// disabled (the roving focus skips them), and the tile for what is rendered there is checked.
	let narrow = $state(false);
	$effect(() => {
		const query = window.matchMedia?.('(max-width: 63.999rem)');
		if (!query) return;
		narrow = query.matches;
		const onChange = (e: MediaQueryListEvent) => (narrow = e.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});

	function choose(key: PreferenceKey, value: string): void {
		// the store checks the value against the schema's enum
		prefs.set({ [key]: value });
	}
</script>

<Sheet.Root bind:open {onOpenChange}>
	<Sheet.Content
		side="right"
		showCloseButton
		class="data-[side=right]:w-full data-[side=right]:sm:max-w-(--customizer-width)"
	>
		<Sheet.Header class="border-border border-b pe-14">
			<Sheet.Title>{$_('customizer.title')}</Sheet.Title>
			<Sheet.Description>{$_('customizer.description')}</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 overflow-y-auto p-4 sm:p-6">
			<div class="flex flex-col gap-8">
				{#each groups as group (group.key)}
					{@const titleId = `customizer-${group.key}-title`}
					{@const hintId = `customizer-${group.key}-hint`}
					{@const hasNarrowHint = narrow && group.options.some((o) => o.hideBelow)}
					<fieldset class="m-0 min-w-0 border-0 p-0">
						<legend id={titleId} class="text-foreground mb-1 text-sm font-semibold">
							{$_(group.titleKey)}
						</legend>
						{#if group.hintKey}
							<p id={hintId} class="text-muted-foreground mb-3 text-sm">{$_(group.hintKey)}</p>
						{:else if hasNarrowHint}
							<p id={hintId} class="text-muted-foreground mb-3 text-sm">
								{$_('customizer.narrowHint')}
							</p>
						{/if}
						<RadioGroup.Root
							value={effectiveValue(group.key, prefs[group.key], narrow)}
							onValueChange={(v) => choose(group.key, v)}
							aria-labelledby={titleId}
							aria-describedby={group.hintKey || hasNarrowHint ? hintId : undefined}
							class={cn(
								'mt-3 grid',
								group.kind === 'swatch'
									? 'grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8'
									: [
											'grid-cols-2 gap-5 md:grid-cols-3',
											group.options.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
										]
							)}
						>
							{#each group.options as option (option.value)}
								<CustomizerTile
									group={group.key}
									value={option.value}
									label={$_(option.labelKey)}
									kind={group.kind}
									disabled={narrow && Boolean(option.hideBelow)}
								/>
							{/each}
						</RadioGroup.Root>
					</fieldset>
				{/each}
			</div>
		</div>

		<Sheet.Footer class="border-border border-t">
			<Button variant="outline" onclick={() => prefs.reset()}>
				<Icon icon={RotateCcw} size="sm" />
				{$_('customizer.reset')}
			</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
